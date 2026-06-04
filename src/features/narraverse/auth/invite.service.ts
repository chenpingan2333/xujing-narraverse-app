import { queryOne, query } from "@/lib/db/pool";
import { randomHex } from "@/lib/auth/crypto";
import type { InviteType, InviteStatusResponse } from "./types.js";

/**
 * InviteService — tiered invite code lifecycle management.
 *
 * Supports BASIC, CREATOR, VIP_TRIAL tiers with atomic consumption.
 * Admin methods check isAdmin on the user record.
 */
export class InviteService {
  /** Generate a set of invite codes */
  async generate(
    createdBy: string,
    type: InviteType,
    count: number,
    maxUses: number = 1,
    expiresInDays?: number,
  ): Promise<string[]> {
    const codes: string[] = [];
    const prefix = type === "VIP_TRIAL" ? "VIP-" : type === "CREATOR" ? "CR-" : "NR-";
    const expiresAt = expiresInDays
      ? `now() + interval '${expiresInDays} days'`
      : "NULL";

    for (let i = 0; i < count; i++) {
      const code = prefix + randomHex(8).toUpperCase();
      await query(
        `INSERT INTO invite_codes (code, type, created_by, max_uses, use_count, is_active, expires_at)
         VALUES ($1, $2, $3, $4, 0, true, ${expiresAt})`,
        [code, type, createdBy, maxUses],
      );
      codes.push(code);
    }
    return codes;
  }

  /** Check if user has been invited, return status with type */
  async getStatus(userId: string): Promise<InviteStatusResponse> {
    const usage = await queryOne<{ id: string; used_at: string; type?: string }>(
      `SELECT iu.id, iu.used_at, ic.type
       FROM invite_usage iu
       JOIN invite_codes ic ON ic.id = iu.invite_code_id
       WHERE iu.used_by = $1`,
      [userId],
    );
    if (!usage) {
      return { invited: false, message: "需要邀请码才能访问叙境" };
    }
    return {
      invited: true,
      type: (usage.type as InviteType) ?? "BASIC",
      usedAt: usage.used_at,
      message: "你已是内测用户",
    };
  }

  /** Check if user is simply invited (boolean) */
  async isInvited(userId: string): Promise<boolean> {
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM invite_usage WHERE used_by = $1`,
      [userId],
    );
    return !!existing;
  }

  /** Check if user is an admin */
  async isAdmin(userId: string): Promise<boolean> {
    const user = await queryOne<{ is_admin: boolean }>(
      `SELECT is_admin FROM users WHERE id = $1`,
      [userId],
    );
    return user?.is_admin ?? false;
  }
}

/** Singleton */
export const inviteService = new InviteService();
