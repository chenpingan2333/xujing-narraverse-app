import { z } from "zod";

// ─── User ─────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  isVip: boolean;
  isBanned: boolean;
  isAdmin: boolean;
}

// ─── Session ──────────────────────────────────────────────────────────────
export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  lastSeenAt: Date;
}

export const SESSION_COOKIE = "narra_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Auth Provider ─────────────────────────────────────────────────────────
export type AuthProviderType = "github" | "email";

export interface AuthProvider {
  id: string;
  userId: string;
  provider: AuthProviderType;
  providerId: string | null;
  email: string | null;
}

// ─── Email OTP ─────────────────────────────────────────────────────────────
export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_COOLDOWN_MS = 30 * 1000;  // 30s between sends
export const OTP_MAX_ATTEMPTS = 5;

export const SendCodeRequest = z.object({
  email: z.string().email(),
});

export const VerifyCodeRequest = z.object({
  email: z.string().email(),
  code: z.string().length(OTP_LENGTH).regex(/^\d+$/),
});

export type SendCodeInput = z.infer<typeof SendCodeRequest>;
export type VerifyCodeInput = z.infer<typeof VerifyCodeRequest>;

// ─── API Key ───────────────────────────────────────────────────────────────
export type ApiKeyProvider = "deepseek" | "grok" | "openai";

export interface ApiKeyRecord {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  encryptedKey: string;
  provider: ApiKeyProvider;
  isActive: boolean;
  usageLimit: number | null;
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  fullKey?: string;
  provider: ApiKeyProvider;
  isActive: boolean;
  usageLimit: number | null;
  usageCount: number;
  createdAt: Date;
}

export const CreateApiKeyRequest = z.object({
  name: z.string().min(1).max(100).optional(),
  provider: z.enum(["deepseek", "grok", "openai"]).default("deepseek"),
  usageLimit: z.number().int().positive().optional(),
});

export type CreateApiKeyInput = z.infer<typeof CreateApiKeyRequest>;

// ─── Invite ────────────────────────────────────────────────────────────────
export type InviteType = "BASIC" | "CREATOR" | "VIP_TRIAL";

export interface InviteCode {
  id: string;
  code: string;
  type: InviteType;
  createdBy: string | null;
  maxUses: number;
  useCount: number;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date | null;
}

export const UseInviteRequest = z.object({
  code: z.string().min(4).max(32),
});

export type UseInviteInput = z.infer<typeof UseInviteRequest>;

export const GenerateInviteRequest = z.object({
  type: z.enum(["BASIC", "CREATOR", "VIP_TRIAL"]),
  count: z.number().int().min(1).max(100),
  maxUses: z.number().int().min(1).max(1000).optional().default(1),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export type GenerateInviteInput = z.infer<typeof GenerateInviteRequest>;

export interface GenerateInviteResponse {
  codes: string[];
  type: InviteType;
  count: number;
}

export interface InviteStatusResponse {
  invited: boolean;
  type?: InviteType;
  usedAt?: string;
  message?: string;
}

// ─── Auth Middleware Context ───────────────────────────────────────────────
export interface AuthContext {
  userId: string;
  sessionId: string;
  user: User;
}
