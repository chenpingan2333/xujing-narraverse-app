import type { ModelRouter, RouteResult, ApiKeyRepository, UserApiKey, ProviderId } from "./provider.types.js";
import { decryptApiKey } from "./key-encryption.js";

interface RouterConfig {
  defaultFreeModel: string;
  defaultVipModel: string;
  premiumModel: string;
  encryptionKey: string;
  apiKeyRepo: ApiKeyRepository;
}

/**
 * Resolves which model/provider to use based on:
 * - User VIP status
 * - Relationship intimacy (romantic/partner → premium)
 * - Character tier (story-tier → premium)
 * - World tier (story-tier → premium)
 */
export class NarraverseRouter implements ModelRouter {
  constructor(private readonly config: RouterConfig) {}

  resolve(params: {
    userId: string;
    isVip: boolean;
    relationshipStatus?: string;
    characterTier?: string;
    worldTier?: string;
  }): Promise<RouteResult> {
    const { isVip, relationshipStatus, characterTier, worldTier } = params;

    // Free users always use their own API key
    if (!isVip) {
      return Promise.resolve({
        providerId: "custom",
        model: "user-key",
        tier: "free",
        source: "user_key",
      });
    }

    // VIP: check if premium upgrade applies
    const shouldUpgrade =
      relationshipStatus === "romantic" ||
      relationshipStatus === "partner" ||
      characterTier === "story" ||
      worldTier === "story";

    if (shouldUpgrade) {
      return Promise.resolve({
        providerId: this.config.premiumModel as ProviderId,
        model: this.resolveModelName(this.config.premiumModel),
        tier: "premium",
        source: "platform",
      });
    }

    // Default VIP
    return Promise.resolve({
      providerId: this.config.defaultVipModel as ProviderId,
      model: this.resolveModelName(this.config.defaultVipModel),
      tier: "vip",
      source: "platform",
    });
  }

  private resolveModelName(providerName: string): string {
    switch (providerName) {
      case "deepseek":
        return process.env["DEEPSEEK_MODEL"] ?? "deepseek-chat";
      case "grok": return process.env["DEEPSEEK_MODEL"] ?? "deepseek-chat";
      default:
        return "unknown";
    }
  }

  /**
   * Fetch and decrypt a user's own API key for the given provider.
   */
  async resolveUserKey(userId: string): Promise<UserApiKey | null> {
    const keys = await this.config.apiKeyRepo.getKeysByUser(userId);
    const active = keys.find((k: UserApiKey) => k.enabled);
    return active ?? null;
  }

  /**
   * Decrypt a stored API key for use in provider calls.
   */
  decryptStoredKey(encrypted: string): string {
    return decryptApiKey(encrypted, this.config.encryptionKey);
  }
}
