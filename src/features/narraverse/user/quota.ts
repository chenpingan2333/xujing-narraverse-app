// 叙境 — User Quota Service
// Manages free-tier limits: character creation count, conversation turns, memory count.
// Anti-abuse: ad rewards have per-user cooldown and server-side verification.

import { query, queryOne } from "@/lib/db/pool";

// ─── Quota Constants ────────────────────────────────────────
import { FREE_CHARACTER_LIMIT, AD_TURN_INTERVAL, FREE_MEMORY_LIMIT, VIP_MEMORY_LIMIT, AD_REWARD_CHARACTER, AD_REWARD_CONVERSATION, AD_COOLDOWN_SECONDS } from "@/config/economy";
export { FREE_CHARACTER_LIMIT, AD_TURN_INTERVAL, FREE_MEMORY_LIMIT, VIP_MEMORY_LIMIT, AD_REWARD_CHARACTER, AD_REWARD_CONVERSATION, AD_COOLDOWN_SECONDS }; // 5 minutes

export type QuotaType = "character_create" | "conversation_turn" | "memory_count";

// ─── User Quota Service ─────────────────────────────────────
export class UserQuotaService {
  /** Get the current value of a quota for a user */
  async getQuota(userId: string, quotaType: QuotaType): Promise<number> {
    const row = await queryOne<{ current_value: number }>(
      "SELECT current_value FROM user_quotas WHERE user_id = $1 AND quota_type = $2",
      [userId, quotaType],
    );
    return row?.current_value ?? 0;
  }

  /** Increment a quota counter and return the new value */
  async increment(userId: string, quotaType: QuotaType, amount: number = 1): Promise<number> {
    await query(
      "INSERT INTO user_quotas (user_id, quota_type, current_value, max_value) VALUES ($1, $2, $3, 999999) ON CONFLICT (user_id, quota_type) DO UPDATE SET current_value = user_quotas.current_value + $3, updated_at = now()",
      [userId, quotaType, amount],
    );
    return this.getQuota(userId, quotaType);
  }

  /** Check if user needs to watch an ad before creating a character */
  async needsAdForCharacter(userId: string, isVip: boolean): Promise<boolean> {
    if (isVip) return false;
    const count = await this.getQuota(userId, "character_create");
    return count >= FREE_CHARACTER_LIMIT;
  }

  /** Check if this turn triggers an ad (every AD_TURN_INTERVAL turns) */
  async needsAdForConversation(userId: string, isVip: boolean): Promise<boolean> {
    if (isVip) return false;
    const turns = await this.getQuota(userId, "conversation_turn");
    return turns > 0 && turns % AD_TURN_INTERVAL === 0;
  }

  /**
   * Log an ad watch and return the reward amount.
   * Anti-abuse: checks cooldown — rejects if user watched an ad within AD_COOLDOWN_SECONDS.
   */
  async logAdWatch(userId: string, adType: "character_create" | "conversation_continue"): Promise<number> {
    // ── Anti-abuse: check cooldown ──
    const recent = await queryOne<{ watched_at: string }>(
      "SELECT watched_at FROM ad_watch_logs WHERE user_id = $1 AND ad_type = $2 ORDER BY watched_at DESC LIMIT 1",
      [userId, adType],
    );

    if (recent) {
      const lastWatch = new Date(recent.watched_at).getTime();
      const elapsed = (Date.now() - lastWatch) / 1000;
      if (elapsed < AD_COOLDOWN_SECONDS) {
        throw new AdCooldownError(
          Math.ceil(AD_COOLDOWN_SECONDS - elapsed),
          adType,
        );
      }
    }

    const reward = adType === "character_create" ? AD_REWARD_CHARACTER : AD_REWARD_CONVERSATION;
    await query(
      "INSERT INTO ad_watch_logs (user_id, ad_type, reward_star) VALUES ($1, $2, $3)",
      [userId, adType, reward],
    );
    return reward;
  }

  /** Get user's current character creation count */
  async getCharacterCount(userId: string): Promise<number> {
    return this.getQuota(userId, "character_create");
  }

  /** Get user's current conversation turns */
  async getConversationTurns(userId: string): Promise<number> {
    return this.getQuota(userId, "conversation_turn");
  }

  /** Get the memory limit for a user based on VIP status */
  getMemoryLimit(isVip: boolean): number {
    return isVip ? VIP_MEMORY_LIMIT : FREE_MEMORY_LIMIT;
  }
}

export class AdCooldownError extends Error {
  constructor(
    public readonly remainingSeconds: number,
    public readonly adType: string,
  ) {
    super("Ad cooldown active: " + remainingSeconds + "s remaining for " + adType);
    this.name = "AdCooldownError";
  }
}

export const userQuotaService = new UserQuotaService();
