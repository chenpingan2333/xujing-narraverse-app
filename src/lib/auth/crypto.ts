import { createHash, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { hash, compare } from "bcryptjs";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const BCRYPT_ROUNDS = 12;

function getEncryptionKey(): Buffer {
  const key = process.env["API_KEY_ENCRYPTION_KEY"];
  if (!key) throw new Error("API_KEY_ENCRYPTION_KEY not set");
  // Derive 32-byte key from the configured secret
  return createHash("sha256").update(key).digest();
}

/** Hash data with SHA-256 (for tokens, codes, API key lookup) */
export function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Generate a cryptographically random hex string */
export function randomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

/** Generate a 6-digit numeric OTP code */
export function generateOtp(): string {
  const num = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return String(num).padStart(6, "0");
}

/** Generate a session token: 32 random bytes → hex */
export function generateSessionToken(): string {
  return randomHex(32);
}

/** Hash a password with bcrypt (12 rounds) */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

/** Verify a password against a bcrypt hash */
export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return compare(password, hashed);
}

/** Generate an API key with prefix: narra_sk_<32 random hex> */
export function generateApiKey(): { fullKey: string; keyHash: string; keyPrefix: string } {
  const suffix = randomHex(32);
  const fullKey = `narra_sk_${suffix}`;
  const keyHash = sha256(fullKey);
  const keyPrefix = fullKey.slice(0, 15); // "narra_sk_" + first 8 hex chars
  return { fullKey, keyHash, keyPrefix };
}

/** Encrypt a plaintext string using AES-256-GCM */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv:tag:ciphertext (all hex-encoded)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** Decrypt a ciphertext string encrypted by encrypt() */
export function decrypt(combined: string): string {
  const key = getEncryptionKey();
  const [ivHex, tagHex, encryptedHex] = combined.split(":");
  if (!ivHex || !tagHex || !encryptedHex) throw new Error("Invalid encrypted payload format");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

/** Constant-time string comparison (prevents timing attacks) */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  return createHash("sha256").update(bufA).digest("hex")
      === createHash("sha256").update(bufB).digest("hex");
}