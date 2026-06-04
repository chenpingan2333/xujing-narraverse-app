import { randomUUID } from "node:crypto";
import type {
  LLMProvider,
  ChatRequest,
  ChatResponse,
  ProviderId,
  ApiKeyRepository,
  UsageRepository,
  ModelUsage,
} from "./provider.types.js";
import { estimateCost } from "./token-estimator.js";
import { NarraverseRouter } from "./router.js";

interface GatewayConfig {
  platformProviders: Map<ProviderId, LLMProvider>;
  apiKeyRepo: ApiKeyRepository;
  usageRepo: UsageRepository;
  router: NarraverseRouter;
  encryptionKey: string;
}

export class ProviderGateway {
  constructor(private readonly config: GatewayConfig) {}

  async chat(params: {
    userId: string;
    isVip: boolean;
    relationshipStatus?: string;
    characterTier?: string;
    worldTier?: string;
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }): Promise<ChatResponse> {
    const {
      userId,
      isVip,
      relationshipStatus,
      characterTier,
      worldTier,
      messages,
      temperature,
      maxTokens,
    } = params;

    const route = await this.config.router.resolve({
      userId,
      isVip,
      relationshipStatus,
      characterTier,
      worldTier,
    });

    let provider: LLMProvider;
    let effectiveModel: string;
    let actualProviderId = route.providerId;

    if (route.source === "user_key") {
      const userKey = await this.config.router.resolveUserKey(userId);
      if (!userKey) {
        throw new Error(
          "No API key configured. Free users must provide their own API key.",
        );
      }

      const decrypted = this.config.router.decryptStoredKey(
        userKey.apiKeyEncrypted,
      );

      const { CustomProvider } = await import(
        "./providers/provider-impls.js"
      );
      provider = new CustomProvider(
        decrypted,
        userKey.baseUrl,
        userKey.model,
      );
      effectiveModel = userKey.model;
      actualProviderId = userKey.provider;
    } else {
      const p = this.config.platformProviders.get(route.providerId);
      if (!p) {
        throw new Error(
          `Platform provider '${route.providerId}' is not configured`,
        );
      }
      provider = p;
      effectiveModel = route.model;
    }

    const request: ChatRequest = {
      model: effectiveModel,
      messages,
      temperature: temperature ?? 0.6,
      maxTokens: maxTokens ?? 1024,
      stream: false,
    };

    const response = await provider.chat(request);

    const cost = estimateCost(
      actualProviderId,
      response.usage.inputTokens,
      response.usage.outputTokens,
    );

    const usage: ModelUsage = {
      id: randomUUID(),
      userId,
      provider: actualProviderId,
      model: effectiveModel,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      cacheHit: response.usage.cacheHit,
      cost,
      createdAt: Date.now(),
    };

    await this.config.usageRepo.saveUsage(usage);

    return response;
  }
}
