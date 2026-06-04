import { describe, it, expect } from 'vitest';
import { normalizeError, withRetry, ProviderRegistry, ProviderError } from '../provider-resilience.js';
import type { LLMProvider, ChatRequest, ChatResponse } from '../provider.types.js';

const emptyRequest: ChatRequest = { model: "test", messages: [], temperature: 0.7, maxTokens: 100, stream: false };

function makeStub(content: string): LLMProvider {
  return {
    providerId: "deepseek",
    async chat(): Promise<ChatResponse> {
      return {
        id: "stub-1", model: "test-model", content,
        finishReason: "stop", usage: { inputTokens: 10, outputTokens: 20, cacheHit: false }, latencyMs: 5,
      };
    },
  };
}

function makeFailing(msg: string, throwCount = 1): LLMProvider {
  let calls = 0;
  return {
    providerId: "grok",
    async chat(): Promise<ChatResponse> {
      calls++;
      if (calls <= throwCount) throw new Error(msg);
      return {
        id: "fallback-1", model: "test-model", content: "recovered",
        finishReason: "stop", usage: { inputTokens: 5, outputTokens: 10, cacheHit: false }, latencyMs: 3,
      };
    },
  };
}

describe('normalizeError', () => {
  it('normalizes 429 as RATE_LIMITED', () => {
    const err = normalizeError(new Error("Provider returned 429"), "deepseek", false);
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.retryable).toBe(true);
  });

  it('normalizes 401 as AUTH_FAILED', () => {
    const err = normalizeError(new Error("401 Unauthorized"), "openai", false);
    expect(err.code).toBe("AUTH_FAILED");
    expect(err.retryable).toBe(false);
  });

  it('normalizes timeout as TIMEOUT', () => {
    const err = normalizeError(new Error("ETIMEDOUT"), "deepseek", false);
    expect(err.code).toBe("TIMEOUT");
    expect(err.retryable).toBe(true);
  });

  it('normalizes unknown non-Error as UNKNOWN', () => {
    const err = normalizeError("random string", null, false);
    expect(err.code).toBe("UNKNOWN");
    expect(err.retryable).toBe(false);
  });

  it('tracks fallbackUsed', () => {
    const err = normalizeError(new Error("timeout"), "deepseek", true);
    expect(err.fallbackUsed).toBe(true);
  });
});

describe('withRetry', () => {
  it('returns result on first attempt', async () => {
    const stub = makeStub("hello");
    const { result, retries } = await withRetry(() => stub.chat(emptyRequest), "deepseek");
    expect(result.content).toBe("hello");
    expect(retries).toBe(0);
  });

  it('retries on retryable error and succeeds', async () => {
    const stub = makeFailing("ETIMEDOUT", 1);
    const { result, retries } = await withRetry(() => stub.chat(emptyRequest), "grok");
    expect(result.content).toBe("recovered");
    expect(retries).toBe(1);
  });

  it('throws ProviderError after max retries', async () => {
    const stub = makeFailing("429 Too Many Requests", 99);
    try {
      await withRetry(() => stub.chat(emptyRequest), "grok");
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ProviderError);
      if (e instanceof ProviderError) {
        expect(e.normalized.code).toBe("RATE_LIMITED");
      }
    }
  });
});

describe('ProviderRegistry', () => {
  it('tries chain and returns first success', async () => {
    const reg = new ProviderRegistry();
    reg.add(makeStub("first"), "deepseek");
    reg.add(makeStub("second"), "grok");
    const { response, providerId } = await reg.tryChain(emptyRequest);
    expect(response.content).toBe("first");
    expect(providerId).toBe("deepseek");
  });

  it('falls back to next provider on failure', async () => {
    const reg = new ProviderRegistry();
    reg.add(makeFailing("timeout", 99), "deepseek");
    reg.add(makeStub("fallback"), "grok");
    const { response, providerId } = await reg.tryChain(emptyRequest);
    expect(response.content).toBe("fallback");
    expect(providerId).toBe("grok");
  });

  it('tracks health', () => {
    const reg = new ProviderRegistry();
    reg.add(makeStub("ok"), "deepseek");
    const health = reg.getHealth();
    expect(health.length).toBe(1);
    expect(health[0].healthy).toBe(true);
  });
});
