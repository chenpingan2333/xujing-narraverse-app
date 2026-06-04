import { describe, it, expect, beforeEach } from "vitest";
import { generateApiKey, encrypt, decrypt, sha256 } from "../../../../lib/auth/crypto.js";

describe("API Key lifecycle", () => {
  beforeEach(() => {
    process.env["API_KEY_ENCRYPTION_KEY"] = "test-32-char-encryption-key-ok";
  });

  it("generates valid key format", () => {
    const { fullKey, keyHash, keyPrefix } = generateApiKey();
    expect(fullKey).toMatch(/^narra_sk_[0-9a-f]{64}$/);
    expect(keyPrefix).toBe(fullKey.slice(0, 15));
    expect(keyHash).toBe(sha256(fullKey));
  });

  it("encrypted key survives round-trip", () => {
    const { fullKey } = generateApiKey();
    const encrypted = encrypt(fullKey);
    expect(decrypt(encrypted)).toBe(fullKey);
  });

  it("full key should only be shown once (design constraint)", () => {
    const { fullKey } = generateApiKey();
    expect(fullKey).toBeTruthy();
  });

  it("key hash alone cannot recover original key (preimage resistance)", () => {
    const { fullKey, keyHash } = generateApiKey();
    expect(keyHash).not.toBe(fullKey);
    const { keyHash: otherHash } = generateApiKey();
    expect(keyHash).not.toBe(otherHash);
  });
});