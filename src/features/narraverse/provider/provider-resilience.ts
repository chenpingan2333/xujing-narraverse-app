import type { LLMProvider, ChatRequest, ChatResponse, ProviderId } from "./provider.types.js";

/**
 * Provider Resilience Layer
 */

// ─── Normalized Error ───────────────────────────────────────────────────────

export interface NormalizedProviderError {
  code: string;
  message: string;
  retryable: boolean;
  fallbackUsed: boolean;
  providerId: ProviderId | null;
  statusCode: number | null;
  originalError: string;
}

export class ProviderError extends Error {
  constructor(public readonly normalized: NormalizedProviderError) {
    super(normalized.message);
    this.name = 'ProviderError';
  }
}



export function normalizeError(err: unknown, providerId: ProviderId | null, fallbackUsed: boolean): NormalizedProviderError {
  if (err instanceof Error) {
    const msg = err.message;
    const statusMatch = msg.match(/\b(\d{3})\b/);
    const statusCode = statusMatch ? Number(statusMatch[1]) : null;

    if (statusCode === 429) {
      return { code: "RATE_LIMITED", message: "请求太频繁，正在切换服务节点", retryable: true, fallbackUsed, providerId, statusCode, originalError: msg };
    }
    if (statusCode === 401 || statusCode === 403) {
      return { code: "AUTH_FAILED", message: "AI 服务认证失败", retryable: false, fallbackUsed, providerId, statusCode, originalError: msg };
    }
    if (statusCode === 502 || statusCode === 503 || statusCode === 504) {
      return { code: "PROVIDER_UNAVAILABLE", message: "AI 服务暂时不可用", retryable: true, fallbackUsed, providerId, statusCode, originalError: msg };
    }
    if (/timeout|ETIMEDOUT/i.test(msg)) {
      return { code: "TIMEOUT", message: "AI 响应超时，正在重试", retryable: true, fallbackUsed, providerId, statusCode: null, originalError: msg };
    }
    if (/ECONNREFUSED|fetch failed|network/i.test(msg)) {
      return { code: "NETWORK_ERROR", message: "网络连接失败，正在重试", retryable: true, fallbackUsed, providerId, statusCode: null, originalError: msg };
    }
    return { code: "UNKNOWN", message: "AI 服务异常", retryable: false, fallbackUsed, providerId, statusCode: null, originalError: msg };
  }
  return { code: "UNKNOWN", message: "未知错误", retryable: false, fallbackUsed, providerId: null, statusCode: null, originalError: String(err) };
}

// ─── Retry Strategy ─────────────────────────────────────────────────────────

export interface RetryConfig { maxRetries: number; baseDelayMs: number; maxDelayMs: number; }

const DEFAULT_RETRY: RetryConfig = { maxRetries: 2, baseDelayMs: 300, maxDelayMs: 3000 };

function delay(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

export async function withRetry<T>(
  fn: () => Promise<T>,
  providerId: ProviderId,
  config: RetryConfig = DEFAULT_RETRY,
): Promise<{ result: T; retries: number; fallbackUsed: boolean }> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await fn();
      return { result, retries: attempt, fallbackUsed: attempt > 0 };
    } catch (err) {
      lastError = err;
      const normalized = normalizeError(err, providerId, attempt > 0);
      if (!normalized.retryable || attempt >= config.maxRetries) {
        throw new ProviderError(normalized);
      }
      const waitMs = Math.min(config.baseDelayMs * Math.pow(2, attempt), config.maxDelayMs);
      await delay(waitMs);
    }
  }
  throw new ProviderError(normalizeError(lastError, providerId, true));
}

// ─── Provider Registry for Fallback ────────────────────────────────────────

interface ProviderEntry { provider: LLMProvider; id: ProviderId; failures: number; lastFailure: number; }

export class ProviderRegistry {
  private entries: ProviderEntry[] = [];
  private readonly maxFailures: number;
  private readonly cooldownMs: number;

  constructor(maxFailures = 3, cooldownMs = 60_000) {
    this.maxFailures = maxFailures;
    this.cooldownMs = cooldownMs;
  }

  add(provider: LLMProvider, id: ProviderId): this {
    this.entries.push({ provider, id, failures: 0, lastFailure: 0 });
    return this;
  }

  private isHealthy(e: ProviderEntry): boolean {
    if (e.failures < this.maxFailures) return true;
    if (Date.now() - e.lastFailure > this.cooldownMs) { e.failures = 0; return true; }
    return false;
  }

  recordFailure(e: ProviderEntry): void { e.failures++; e.lastFailure = Date.now(); }

  async tryChain(request: ChatRequest): Promise<{ response: ChatResponse; providerId: ProviderId }> {
    const errors: string[] = [];
    for (const e of this.entries) {
      if (!this.isHealthy(e)) { errors.push(e.id + ': cooldown'); continue; }
      try {
        const response = await e.provider.chat(request);
        return { response, providerId: e.id };
      } catch (err) {
        this.recordFailure(e);
        const n = normalizeError(err, e.id, true);
        errors.push(e.id + ': ' + n.code);
        if (!n.retryable) continue;
      }
    }
    throw new ProviderError(normalizeError(new Error('All providers failed: ' + errors.join('; ')), null, true));
  }

  getHealth(): Array<{ id: ProviderId; healthy: boolean }> {
    return this.entries.map(e => ({ id: e.id, healthy: this.isHealthy(e) }));
  }
}