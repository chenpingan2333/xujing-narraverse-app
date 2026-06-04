import { z } from "zod";

// ─── Provider Identifiers ────────────────────────────────────────────────────

export const ProviderId = z.enum([
  "deepseek",
  "grok",
  "openai",
  "anthropic",
  "gemini",
  "custom",
]);
export type ProviderId = z.infer<typeof ProviderId>;

// ─── Chat Request / Response ─────────────────────────────────────────────────

export const ChatMessage = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessage>;

export const ChatRequest = z.object({
  model: z.string(),
  messages: z.array(ChatMessage),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(128000).default(4096),
  stream: z.boolean().default(false),
});
export type ChatRequest = z.infer<typeof ChatRequest>;

export const ChatResponse = z.object({
  id: z.string(),
  model: z.string(),
  content: z.string(),
  finishReason: z.enum(["stop", "length", "content_filter"]).default("stop"),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    cacheHit: z.boolean().default(false),
  }),
  latencyMs: z.number(),
});
export type ChatResponse = z.infer<typeof ChatResponse>;

// ─── Provider Interface ──────────────────────────────────────────────────────

export interface LLMProvider {
  readonly providerId: ProviderId;
  chat(request: ChatRequest): Promise<ChatResponse>;
}

// ─── Provider Config ─────────────────────────────────────────────────────────

export const ProviderConfig = z.object({
  apiKey: z.string(),
  baseUrl: z.string().url(),
  model: z.string(),
});
export type ProviderConfig = z.infer<typeof ProviderConfig>;

// ─── Routing ─────────────────────────────────────────────────────────────────

export const RouteTier = z.enum(["free", "vip", "premium"]);
export type RouteTier = z.infer<typeof RouteTier>;

export const RouteResult = z.object({
  providerId: ProviderId,
  model: z.string(),
  tier: RouteTier,
  source: z.enum(["platform", "user_key"]),
});
export type RouteResult = z.infer<typeof RouteResult>;

export interface ModelRouter {
  resolve(params: {
    userId: string;
    isVip: boolean;
    relationshipStatus?: string;
    characterTier?: string;
    worldTier?: string;
  }): Promise<RouteResult>;
}

// ─── User API Key ────────────────────────────────────────────────────────────

export const UserApiKey = z.object({
  id: z.string(),
  userId: z.string(),
  provider: ProviderId,
  apiKeyEncrypted: z.string(),
  baseUrl: z.string().url(),
  model: z.string(),
  enabled: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type UserApiKey = z.infer<typeof UserApiKey>;

// ─── Usage Record ────────────────────────────────────────────────────────────

export const ModelUsage = z.object({
  id: z.string(),
  userId: z.string(),
  provider: ProviderId,
  model: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheHit: z.boolean(),
  cost: z.number(),
  createdAt: z.number(),
});
export type ModelUsage = z.infer<typeof ModelUsage>;

// ─── Monthly Usage ───────────────────────────────────────────────────────────

export const MonthlyUsage = z.object({
  userId: z.string(),
  yearMonth: z.string(),
  totalTokens: z.number(),
  totalCost: z.number(),
  cacheHitRate: z.number(),
  requestCount: z.number(),
});
export type MonthlyUsage = z.infer<typeof MonthlyUsage>;

// ─── Usage Repository ────────────────────────────────────────────────────────

export interface UsageRepository {
  saveUsage(usage: ModelUsage): Promise<void>;
  getMonthlyUsage(userId: string, yearMonth: string): Promise<MonthlyUsage | null>;
  getUsageHistory(userId: string, limit: number): Promise<ModelUsage[]>;
}

// ─── API Key Repository ──────────────────────────────────────────────────────

export interface ApiKeyRepository {
  saveKey(key: UserApiKey): Promise<void>;
  getKeysByUser(userId: string): Promise<UserApiKey[]>;
  getKeyById(keyId: string): Promise<UserApiKey | null>;
  deleteKey(keyId: string): Promise<void>;
  updateKeyEnabled(keyId: string, enabled: boolean): Promise<void>;
}

// ─── Gateway ─────────────────────────────────────────────────────────────────

export interface ProviderGatewayConfig {
  platformProviders: Map<ProviderId, LLMProvider>;
  apiKeyRepo: ApiKeyRepository;
  usageRepo: UsageRepository;
  router: ModelRouter;
  encryptionKey: Buffer;
}
