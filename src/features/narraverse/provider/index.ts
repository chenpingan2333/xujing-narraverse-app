// Provider interface — re-exports for unified access
export type { LLMProvider } from "./provider.types.js";

// Types & schemas
export {
  ProviderId,
  type ChatRequest,
  type ChatResponse,
  type ProviderConfig,
  type RouteResult,
  type RouteTier,
  type UserApiKey,
  type ModelUsage,
  type MonthlyUsage,
  type UsageRepository,
  type ApiKeyRepository,
  ChatRequest as ChatRequestSchema,
  ChatResponse as ChatResponseSchema,
  ProviderConfig as ProviderConfigSchema,
  RouteResult as RouteResultSchema,
} from "./provider.types.js";

// Encryption
export {
  encryptApiKey,
  decryptApiKey,
  maskApiKey,
  sanitizeHeaders,
} from "./key-encryption.js";

// Providers
export {
  DeepSeekProvider,
  GrokProvider,
  OpenAIProvider,
  CustomProvider,
} from "./providers/provider-impls.js";

// Router
export { NarraverseRouter } from "./router.js";

// Gateway
export { ProviderGateway } from "./provider.gateway.js";

// Token estimator
export {
  estimateTokens,
  estimateCost,
  detectCacheHit,
} from "./token-estimator.js";

// Schema
export { runProviderMigrations } from "./provider.schema.js";

// Repositories (in-memory, for testing)
export {
  InMemoryApiKeyRepository,
  InMemoryUsageRepository,
} from "./provider.repos.js";
