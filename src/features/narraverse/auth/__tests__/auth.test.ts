import { describe, it, expect, beforeEach } from "vitest";
import { sha256, generateOtp, generateSessionToken, generateApiKey, encrypt, decrypt, timingSafeEqual } from "../../../../lib/auth/crypto.js";
import { OTP_LENGTH, OTP_TTL_MS, OTP_COOLDOWN_MS, OTP_MAX_ATTEMPTS, SendCodeRequest, VerifyCodeRequest, CreateApiKeyRequest } from "../types.js";

// ── Crypto Utilities ──────────────────────────────────────

describe("sha256", () => {
  it("produces consistent hashes", () => {
    expect(sha256("hello")).toBe(sha256("hello"));
  });

  it("produces different hashes for different inputs", () => {
    expect(sha256("hello")).not.toBe(sha256("world"));
  });

  it("returns 64-character hex string", () => {
    expect(sha256("test")).toHaveLength(64);
    expect(sha256("test")).toMatch(/^[0-9a-f]+$/);
  });
});

describe("generateOtp", () => {
  it("returns a 6-digit string", () => {
    const code = generateOtp();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^\d{6}$/);
  });

  it("generates different codes on successive calls", () => {
    const codes = new Set(Array.from({ length: 10 }, () => generateOtp()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("generateSessionToken", () => {
  it("returns a 64-character hex string", () => {
    const token = generateSessionToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]+$/);
  });

  it("generates unique tokens", () => {
    expect(generateSessionToken()).not.toBe(generateSessionToken());
  });
});

describe("generateApiKey", () => {
  it("returns key with narra_sk_ prefix", () => {
    const { fullKey } = generateApiKey();
    expect(fullKey).toMatch(/^narra_sk_[0-9a-f]{64}$/);
  });

  it("returns matching hash and prefix", () => {
    const { fullKey, keyHash, keyPrefix } = generateApiKey();
    expect(sha256(fullKey)).toBe(keyHash);
    expect(fullKey.startsWith(keyPrefix)).toBe(true);
    expect(keyPrefix).toHaveLength(15);
  });
});

describe("encrypt / decrypt", () => {
  beforeEach(() => {
    process.env["API_KEY_ENCRYPTION_KEY"] = "test-32-char-encryption-key-ok";
  });

  it("round-trips correctly", () => {
    const plaintext = "narra_sk_test_key_12345678";
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it("produces different ciphertexts for same plaintext", () => {
    const e1 = encrypt("secret");
    const e2 = encrypt("secret");
    expect(e1).not.toBe(e2);
    expect(decrypt(e1)).toBe("secret");
    expect(decrypt(e2)).toBe("secret");
  });

  it("throws on invalid payload format", () => {
    expect(() => decrypt("bad-format")).toThrow();
  });
});

describe("timingSafeEqual", () => {
  it("returns true for equal strings", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
  });

  it("returns false for different strings", () => {
    expect(timingSafeEqual("abc", "abd")).toBe(false);
  });
});

// ── OTP Constants ─────────────────────────────────────────

describe("OTP constants", () => {
  it("OTP_LENGTH is 6", () => { expect(OTP_LENGTH).toBe(6); });
  it("OTP_TTL_MS is 10 minutes", () => { expect(OTP_TTL_MS).toBe(10 * 60 * 1000); });
  it("OTP_COOLDOWN_MS is 30 seconds", () => { expect(OTP_COOLDOWN_MS).toBe(30_000); });
  it("OTP_MAX_ATTEMPTS is 5", () => { expect(OTP_MAX_ATTEMPTS).toBe(5); });
});

// ── Zod Schemas ────────────────────────────────────────────

describe("SendCodeRequest", () => {
  it("accepts valid email", () => {
    expect(() => SendCodeRequest.parse({ email: "test@example.com" })).not.toThrow();
  });

  it("rejects invalid email", () => {
    expect(() => SendCodeRequest.parse({ email: "not-an-email" })).toThrow();
  });
});

describe("VerifyCodeRequest", () => {
  it("accepts valid 6-digit code", () => {
    expect(() => VerifyCodeRequest.parse({ email: "a@b.com", code: "123456" })).not.toThrow();
  });

  it("rejects non-numeric code", () => {
    expect(() => VerifyCodeRequest.parse({ email: "a@b.com", code: "abcdef" })).toThrow();
  });
});

describe("CreateApiKeyRequest", () => {
  it("defaults provider to deepseek", () => {
    const result = CreateApiKeyRequest.parse({});
    expect(result.provider).toBe("deepseek");
  });

  it("rejects invalid provider", () => {
    expect(() => CreateApiKeyRequest.parse({ provider: "google" })).toThrow();
  });
});
