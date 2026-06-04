import type { LLMProvider, ChatRequest, ChatResponse, ProviderId } from "./provider.types.js";

/**
 * Provider Fallback Strategy
 *
 * When a primary provider fails, fall through the chain:
 *   DeepSeek → Grok → OpenAI → Error
 *
 * Each provider is health-checked before use.
 * A provider is considered unhealthy after 3 consecutive failures
 * and is retried after a 60-second cooldown.
 */

interface ProviderWithHealth {
  provider: LLMProvider;
  id: ProviderId;
  failures: number;
  lastFailure: number;
  cooldownMs: number;
}

export class ProviderFallbackChain {
  private providers: ProviderWithHealth[] = [];
  private readonly maxFailures: number;
  private readonly cooldownMs: number;

  constructor(options: { maxFailures?: number; cooldownMs?: number } = {}) {
    this.maxFailures = options.maxFailures ?? 3;
    this.cooldownMs = options.cooldownMs ?? 60_000;
  }

  /** Register a provider in priority order (first = highest priority) */
  addProvider(provider: LLMProvider, id: ProviderId): this {
    this.providers.push({
      provider,
      id,
      failures: 0,
      lastFailure: 0,
      cooldownMs: this.cooldownMs,
    });
    return this;
  }

  /** Check if a provider is currently healthy */
  isHealthy(p: ProviderWithHealth): boolean {
    if (p.failures < this.maxFailures) return true;
    const elapsed = Date.now() - p.lastFailure;
    if (elapsed > p.cooldownMs) {
      p.failures = 0; // Reset after cooldown
      return true;
    }
    return false;
  }

  /** Record a failure for a provider */
  recordFailure(p: ProviderWithHealth): void {
    p.failures++;
    p.lastFailure = Date.now();
  }

  /** Try the chain and return the first successful response */
  async chat(request: ChatRequest): Promise<{ response: ChatResponse; providerId: ProviderId }> {
    const errors: string[] = [];

    for (const p of this.providers) {
      if (!this.isHealthy(p)) {
        errors.push(`${p.id}: in cooldown (${p.failures} failures)`);
        continue;
      }

      try {
        const response = await p.provider.chat(request);
        return { response, providerId: p.id };
      } catch (err) {
        this.recordFailure(p);
        errors.push(`${p.id}: ${String(err)}`);
      }
    }

    throw new Error(`All providers failed:\n${errors.join("\n")}`);
  }

  /** Get current health status of all providers */
  getHealth(): Array<{ id: ProviderId; healthy: boolean; failures: number }> {
    return this.providers.map((p) => ({
      id: p.id,
      healthy: this.isHealthy(p),
      failures: p.failures,
    }));
  }
}
