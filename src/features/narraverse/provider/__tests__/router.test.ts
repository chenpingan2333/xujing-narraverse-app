
import { describe, it, expect } from 'vitest';
import { NarraverseRouter } from "../router.js";
import { encryptApiKey } from "../key-encryption.js";
import type { ApiKeyRepository, UserApiKey } from "../provider.types.js";

// ─── Test Helpers ────────────────────────────────────────────────────────────

const ENCRYPTION_KEY = "test-encryption-key-for-router-tests-32chars!!";

class InMemoryApiKeyRepo implements ApiKeyRepository {
  private keys = new Map<string, UserApiKey>();

  saveKey(key: UserApiKey): Promise<void> {
    this.keys.set(key.id, key);
    return Promise.resolve();
  }

  getKeysByUser(userId: string): Promise<UserApiKey[]> {
    return Promise.resolve([...this.keys.values()].filter((k) => k.userId === userId));
  }

  getKeyById(keyId: string): Promise<UserApiKey | null> {
    return Promise.resolve(this.keys.get(keyId) ?? null);
  }

  deleteKey(keyId: string): Promise<void> {
    this.keys.delete(keyId);
    return Promise.resolve();
  }

  updateKeyEnabled(keyId: string, enabled: boolean): Promise<void> {
    const key = this.keys.get(keyId);
    if (key) {
      key.enabled = enabled;
      key.updatedAt = Date.now();
    }
    return Promise.resolve();
  }

  clear(): void {
    this.keys.clear();
  }
}

function makeRouter(
  overrides: Partial<{
    defaultFreeModel: string;
    defaultVipModel: string;
    premiumModel: string;
  }> = {},
): NarraverseRouter {
  return new NarraverseRouter({
    defaultFreeModel: overrides.defaultFreeModel ?? "deepseek",
    defaultVipModel: overrides.defaultVipModel ?? "deepseek",
    premiumModel: overrides.premiumModel ?? "grok",
    encryptionKey: ENCRYPTION_KEY,
    apiKeyRepo: new InMemoryApiKeyRepo(),
  });
}

const BASE_PARAMS = {
  userId: "u1",
  isVip: false,
};

// ─── Free User Routing ───────────────────────────────────────────────────────

describe("NarraverseRouter — Free Users", () => {
  it("should route free users to custom provider with user_key source", async () => {
    const router = makeRouter();
    const result = await router.resolve({ ...BASE_PARAMS, isVip: false });

    expect(result.providerId).toBe("custom");
    expect(result.model).toBe("user-key");
    expect(result.tier).toBe("free");
    expect(result.source).toBe("user_key");
  });

  it("should route free users regardless of relationship status", async () => {
    const router = makeRouter();
    const result = await router.resolve({
      ...BASE_PARAMS,
      isVip: false,
      relationshipStatus: "romantic",
    });

    expect(result.tier).toBe("free");
    expect(result.source).toBe("user_key");
  });

  it("should route free users regardless of character tier", async () => {
    const router = makeRouter();
    const result = await router.resolve({
      ...BASE_PARAMS,
      isVip: false,
      characterTier: "story",
    });

    expect(result.tier).toBe("free");
  });
});

// ─── VIP Default Routing ─────────────────────────────────────────────────────

describe("NarraverseRouter — VIP Users", () => {
  it("should route basic VIP to default model", async () => {
    const router = makeRouter({ defaultVipModel: "deepseek" });
    const result = await router.resolve({ ...BASE_PARAMS, isVip: true });

    expect(result.providerId).toBe("deepseek");
    expect(result.tier).toBe("vip");
    expect(result.source).toBe("platform");
  });

  it("should route VIP to grok when defaultVipModel is grok", async () => {
    const router = makeRouter({ defaultVipModel: "grok" });
    const result = await router.resolve({ ...BASE_PARAMS, isVip: true });

    expect(result.providerId).toBe("grok");
    expect(result.tier).toBe("vip");
  });
});

// ─── Premium Routing ─────────────────────────────────────────────────────────

describe("NarraverseRouter — Premium Routing", () => {
  it("should upgrade to premium for romantic relationship", async () => {
    const router = makeRouter();
    const result = await router.resolve({
      ...BASE_PARAMS,
      isVip: true,
      relationshipStatus: "romantic",
    });

    expect(result.tier).toBe("premium");
    expect(result.providerId).toBe("grok");
  });

  it("should upgrade to premium for partner relationship", async () => {
    const router = makeRouter();
    const result = await router.resolve({
      ...BASE_PARAMS,
      isVip: true,
      relationshipStatus: "partner",
    });

    expect(result.tier).toBe("premium");
  });

  it("should upgrade to premium for story-tier character", async () => {
    const router = makeRouter();
    const result = await router.resolve({
      ...BASE_PARAMS,
      isVip: true,
      characterTier: "story",
    });

    expect(result.tier).toBe("premium");
  });

  it("should upgrade to premium for story-tier world", async () => {
    const router = makeRouter();
    const result = await router.resolve({
      ...BASE_PARAMS,
      isVip: true,
      worldTier: "story",
    });

    expect(result.tier).toBe("premium");
  });

  it("should NOT upgrade for non-romantic, non-story VIP users", async () => {
    const router = makeRouter();
    const result = await router.resolve({
      ...BASE_PARAMS,
      isVip: true,
      relationshipStatus: "friend",
      characterTier: "basic",
      worldTier: "basic",
    });

    expect(result.tier).toBe("vip");
    expect(result.providerId).toBe("deepseek");
  });

  it("should upgrade when ANY premium trigger is active", async () => {
    const router = makeRouter();
    // Only worldTier is story, others are basic
    const result = await router.resolve({
      ...BASE_PARAMS,
      isVip: true,
      relationshipStatus: "acquaintance",
      characterTier: "basic",
      worldTier: "story",
    });

    expect(result.tier).toBe("premium");
  });
});

// ─── User Key Resolution ─────────────────────────────────────────────────────

describe("NarraverseRouter — User Key Resolution", () => {
  it("should return null when user has no keys", async () => {
    const router = makeRouter();
    const key = await router.resolveUserKey("no-keys-user");
    expect(key).toBeNull();
  });

  it("should return the active key for a user", async () => {
    const repo = new InMemoryApiKeyRepo();
    const encrypted = encryptApiKey("sk-user-real-key", ENCRYPTION_KEY);
    const userKey: UserApiKey = {
      id: "key1",
      userId: "u1",
      provider: "deepseek",
      apiKeyEncrypted: encrypted,
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-chat",
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await repo.saveKey(userKey);

    // Hack: replace the repo (router doesn't expose it, but we construct with it)
    const routerWithKeys = new NarraverseRouter({
      defaultFreeModel: "deepseek",
      defaultVipModel: "deepseek",
      premiumModel: "grok",
      encryptionKey: ENCRYPTION_KEY,
      apiKeyRepo: repo,
    });

    const result = await routerWithKeys.resolveUserKey("u1");
    expect(result).not.toBeNull();
    expect(result?.provider).toBe('deepseek');
    expect(result?.enabled).toBe(true);
  });

  it("should prefer the active key when multiple exist", async () => {
    const repo = new InMemoryApiKeyRepo();
    const disabledKey: UserApiKey = {
      id: "k-disabled",
      userId: "u1",
      provider: "deepseek",
      apiKeyEncrypted: encryptApiKey("sk-disabled", ENCRYPTION_KEY),
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-chat",
      enabled: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const activeKey: UserApiKey = {
      id: "k-active",
      userId: "u1",
      provider: "openai",
      apiKeyEncrypted: encryptApiKey("sk-active", ENCRYPTION_KEY),
      baseUrl: "https://api.openai.com",
      model: "gpt-4o",
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await repo.saveKey(disabledKey);
    await repo.saveKey(activeKey);

    const router = new NarraverseRouter({
      defaultFreeModel: "deepseek",
      defaultVipModel: "deepseek",
      premiumModel: "grok",
      encryptionKey: ENCRYPTION_KEY,
      apiKeyRepo: repo,
    });

    const result = await router.resolveUserKey("u1");
    expect(result).not.toBeNull();
    expect(result?.id).toBe('k-active');
    expect(result?.provider).toBe('openai');
  });

  it("should decrypt stored keys correctly", () => {
    const router = makeRouter();
    const plaintext = "my-secret-api-key-12345";
    const encrypted = encryptApiKey(plaintext, ENCRYPTION_KEY);

    const decrypted = router.decryptStoredKey(encrypted);
    expect(decrypted).toBe(plaintext);
  });
});

// ─── Model Name Resolution ───────────────────────────────────────────────────

describe("NarraverseRouter — Model Name Resolution", () => {
  it("should resolve deepseek to default model name", async () => {
    const router = makeRouter({ defaultVipModel: "deepseek" });
    const result = await router.resolve({ ...BASE_PARAMS, isVip: true });
    expect(result.model).toMatch(/deepseek-chat/);
  });

  it("should resolve grok to default model name", async () => {
    const router = makeRouter({ premiumModel: "grok" });
    const result = await router.resolve({
      ...BASE_PARAMS,
      isVip: true,
      relationshipStatus: "romantic",
    });
    expect(result.model).toMatch(/grok/);
  });
});


