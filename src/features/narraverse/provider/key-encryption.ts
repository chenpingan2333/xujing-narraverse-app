import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Derive a 32-byte encryption key from a user-provided key string.
 * Uses scrypt for key derivation.
 */
function deriveKey(rawKey: string, salt: Buffer): Buffer {
  return scryptSync(rawKey, salt, 32);
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns a hex-encoded string containing salt + iv + authTag + ciphertext.
 *
 * Format: salt(32B) + iv(12B) + authTag(16B) + ciphertext
 */
export function encryptApiKey(plaintext: string, rawKey: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(rawKey, salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, authTag, encrypted]).toString("hex");
}

/**
 * Decrypt a hex-encoded ciphertext produced by encryptApiKey().
 */
export function decryptApiKey(encryptedHex: string, rawKey: string): string {
  const data = Buffer.from(encryptedHex, "hex");

  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = data.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
  );
  const ciphertext = data.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = deriveKey(rawKey, salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Mask an API key for safe logging.
 * Example: "sk-abc123xyz789" → "sk-abc****z789"
 */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 7) + "****" + key.slice(-4);
}

/**
 * Sanitize headers for logging — strip Authorization and any token-bearing headers.
 */
export function sanitizeHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const lower = k.toLowerCase();
    if (lower === "authorization" || lower.includes("token") || lower.includes("key")) {
      sanitized[k] = maskApiKey(v);
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}
