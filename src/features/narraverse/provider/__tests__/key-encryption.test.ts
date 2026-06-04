import { describe, it, expect } from "vitest";
import {
  encryptApiKey,
  decryptApiKey,
  maskApiKey,
  sanitizeHeaders,
} from "../key-encryption.js";

describe("encryptApiKey / decryptApiKey", () => {
  const rawKey = "my-32-character-encryption-key!!";

  it("should encrypt and decrypt a short API key round-trip", () => {
    const plaintext = "sk-abc123xyz789";
    const encrypted = encryptApiKey(plaintext, rawKey);
    expect(encrypted).not.toBe(plaintext);
    expect(typeof encrypted).toBe("string");
    expect(encrypted.length).toBeGreaterThan(0);

    const decrypted = decryptApiKey(encrypted, rawKey);
    expect(decrypted).toBe(plaintext);
  });

  it("should encrypt and decrypt a long API key round-trip", () => {
    const plaintext = "sk-" + "a".repeat(200);
    const encrypted = encryptApiKey(plaintext, rawKey);
    const decrypted = decryptApiKey(encrypted, rawKey);
    expect(decrypted).toBe(plaintext);
  });

  it("should produce different ciphertexts for the same plaintext (random IV/salt)", () => {
    const plaintext = "sk-consistent-key";
    const e1 = encryptApiKey(plaintext, rawKey);
    const e2 = encryptApiKey(plaintext, rawKey);
    expect(e1).not.toBe(e2);
    // Both should decrypt to the same plaintext
    expect(decryptApiKey(e1, rawKey)).toBe(plaintext);
    expect(decryptApiKey(e2, rawKey)).toBe(plaintext);
  });

  it("should fail to decrypt with a different key", () => {
    const plaintext = "sk-secret-key";
    const encrypted = encryptApiKey(plaintext, rawKey);
    expect(() => decryptApiKey(encrypted, "different-key-32chars-long!!!!!")).toThrow();
  });

  it("should fail to decrypt with wrong ciphertext", () => {
    expect(() => decryptApiKey("not-valid-hex", rawKey)).toThrow();
    expect(() => decryptApiKey("aabb", rawKey)).toThrow();
  });

  it("should handle empty key", () => {
    const encrypted = encryptApiKey("sk-empty", rawKey);
    const decrypted = decryptApiKey(encrypted, rawKey);
    expect(decrypted).toBe("sk-empty");
  });

  it("should handle special characters in plaintext", () => {
    const plaintext = 'sk-!@#$%^&*()_+{}|:"<>?~`';
    const encrypted = encryptApiKey(plaintext, rawKey);
    const decrypted = decryptApiKey(encrypted, rawKey);
    expect(decrypted).toBe(plaintext);
  });

  it("should handle unicode in plaintext", () => {
    const plaintext = "sk-你好世界-こんにちは";
    const encrypted = encryptApiKey(plaintext, rawKey);
    const decrypted = decryptApiKey(encrypted, rawKey);
    expect(decrypted).toBe(plaintext);
  });

  it("should have minimum output length (salt + iv + authTag + at least 1 ciphertext byte)", () => {
    const encrypted = encryptApiKey("x", rawKey);
    // salt(64 hex) + iv(24 hex) + authTag(32 hex) = 120 hex chars minimum + ciphertext
    expect(encrypted.length).toBeGreaterThanOrEqual(120);
  });
});

describe("maskApiKey", () => {
  it("should mask middle of a standard key", () => {
    const masked = maskApiKey("sk-abc123xyz789def");
    expect(masked).toMatch(/^sk-abc1/);
    expect(masked).toMatch(/def$/);
    expect(masked).toContain("****");
  });

  it("should return **** for very short keys", () => {
    expect(maskApiKey("abc")).toBe("****");
    expect(maskApiKey("12345678")).toBe("****");
  });

  it("should not reveal full key", () => {
    const key = "sk-this-is-a-secret-key-12345";
    const masked = maskApiKey(key);
    expect(masked).not.toBe(key);
    expect(masked).not.toContain("secret");
  });
});

describe("sanitizeHeaders", () => {
  it("should mask Authorization header", () => {
    const headers = { Authorization: "Bearer sk-secret", "Content-Type": "application/json" };
    const sanitized = sanitizeHeaders(headers);
    expect(sanitized["Authorization"]).toContain("****");
    expect(sanitized["Authorization"]).not.toContain("secret");
    expect(sanitized["Content-Type"]).toBe("application/json");
  });

  it("should mask headers containing 'token'", () => {
    const headers = { "x-api-token": "tok-12345", Accept: "application/json" };
    const sanitized = sanitizeHeaders(headers);
    expect(sanitized["x-api-token"]).toContain("****");
    expect(sanitized["Accept"]).toBe("application/json");
  });

  it("should mask headers containing 'key'", () => {
    const headers = { "x-api-key": "key-abcdef", Host: "api.example.com" };
    const sanitized = sanitizeHeaders(headers);
    expect(sanitized["x-api-key"]).toContain("****");
    expect(sanitized["Host"]).toBe("api.example.com");
  });

  it("should handle empty headers", () => {
    const sanitized = sanitizeHeaders({});
    expect(Object.keys(sanitized)).toHaveLength(0);
  });

  it("should case-insensitively match Authorization", () => {
    const headers = { authorization: "Bearer sk-lower" };
    const sanitized = sanitizeHeaders(headers);
    expect(sanitized["authorization"]).toContain("****");
  });
});
