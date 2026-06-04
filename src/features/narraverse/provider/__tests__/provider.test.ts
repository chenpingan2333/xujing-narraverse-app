import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  DeepSeekProvider,
  GrokProvider,
  OpenAIProvider,
  CustomProvider,
} from "../providers/provider-impls.js";
import type { ChatRequest } from "../provider.types.js";

// ─── Fetch Interception ──────────────────────────────────────────────────────

let _fetchInterceptor: ((url: string, init?: RequestInit) => Promise<Response>) | null = null;

function installFetchInterceptor(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): void {
  _fetchInterceptor = async (url: string, init?: RequestInit) => {
    return handler(url, init);
  };
}

function resetFetchInterceptor(): void {
  _fetchInterceptor = null;
}

beforeEach(() => {
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
    if (_fetchInterceptor) return _fetchInterceptor(url, init);
    throw new Error("fetch called without interceptor installed");
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetFetchInterceptor();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeChatRequest(overrides: Partial<ChatRequest> = {}): ChatRequest {
  return {
    model: "test-model",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Hello!" },
    ],
    temperature: 0.7,
    maxTokens: 4096,
    stream: false,
    ...overrides,
  };
}

function makeSuccessBody(overrides: {
  content?: string;
  id?: string;
  model?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  finish_reason?: string;
} = {}): string {
  const {
    content = "Hello! How can I help you?",
    id = "chatcmpl-test-001",
    model = "test-model-v1",
    prompt_tokens = 25,
    completion_tokens = 10,
    finish_reason = "stop",
  } = overrides;
  return JSON.stringify({
    id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason,
      },
    ],
    usage: { prompt_tokens, completion_tokens, total_tokens: prompt_tokens + completion_tokens },
  });
}

function makeErrorBody(status: number, message: string): string {
  return JSON.stringify({ error: { message, type: "api_error", code: status } });
}

function makeResponse(body: string, status: number, headers?: Record<string, string>): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

// ─── DeepSeek Provider ───────────────────────────────────────────────────────

describe("DeepSeekProvider", () => {
  const apiKey = "sk-deepseek-test-key";
  const baseUrl = "https://api.deepseek.com";
  const model = "deepseek-chat";

  it("should make a successful chat call via OpenAI-compatible endpoint", async () => {
    installFetchInterceptor((url, init) => {
      expect(url).toBe("https://api.deepseek.com/v1/chat/completions");
      const body = JSON.parse((init as RequestInit & { body: string }).body) as Record<string, unknown>;
      expect(body.model).toBe("deepseek-chat");
      return makeResponse(makeSuccessBody(), 200);
    });

    const provider = new DeepSeekProvider(apiKey, baseUrl, model);
    const response = await provider.chat(makeChatRequest());

    expect(response.content).toBe("Hello! How can I help you?");
    expect(response.model).toBe("deepseek-chat");
    expect(response.finishReason).toBe("stop");
    expect(response.usage.inputTokens).toBe(25);
    expect(response.usage.outputTokens).toBe(10);
    expect(response.latencyMs).toBeGreaterThanOrEqual(0);
    expect(response.id).toBe("chatcmpl-test-001");
  });

  it("should throw on non-200 response with status code in message", async () => {
    installFetchInterceptor(() => makeResponse(makeErrorBody(429, "Rate limit exceeded"), 429));

    const provider = new DeepSeekProvider(apiKey, baseUrl, model);
    await expect(provider.chat(makeChatRequest())).rejects.toThrow(/429/);
  });

  it("should throw when API key is empty", async () => {
    const provider = new DeepSeekProvider("", baseUrl, model);
    await expect(provider.chat(makeChatRequest())).rejects.toThrow("DEEPSEEK_API_KEY");
  });

  it("should detect cache hit from response headers", async () => {
    installFetchInterceptor(() =>
      makeResponse(makeSuccessBody(), 200, { "x-ds-cache-hit": "true" }),
    );

    const provider = new DeepSeekProvider(apiKey, baseUrl, model);
    const response = await provider.chat(makeChatRequest());
    expect(response.usage.cacheHit).toBe(true);
  });

  it("should strip trailing slash from base URL", async () => {
    let calledUrl = "";
    installFetchInterceptor((url) => {
      calledUrl = url;
      return makeResponse(makeSuccessBody(), 200);
    });

    const provider = new DeepSeekProvider(apiKey, "https://api.deepseek.com/", model);
    await provider.chat(makeChatRequest());
    expect(calledUrl).toBe("https://api.deepseek.com/v1/chat/completions");
  });

  it("should have correct providerId", () => {
    const provider = new DeepSeekProvider(apiKey, baseUrl, model);
    expect(provider.providerId).toBe("deepseek");
  });
});

// ─── Grok Provider ───────────────────────────────────────────────────────────

describe("GrokProvider", () => {
  const apiKey = "xai-grok-test-key";
  const baseUrl = "https://api.x.ai";
  const model = "grok-4-fast";

  it("should make a successful chat call", async () => {
    installFetchInterceptor((url) => {
      expect(url).toContain("/v1/chat/completions");
      return makeResponse(makeSuccessBody({ content: "Grok says hello", model: "grok-4-fast" }), 200);
    });

    const provider = new GrokProvider(apiKey, baseUrl, model);
    const response = await provider.chat(makeChatRequest());

    expect(response.content).toBe("Grok says hello");
    expect(response.model).toBe("grok-4-fast");
  });

  it("should throw when API key is empty", async () => {
    const provider = new GrokProvider("", baseUrl, model);
    await expect(provider.chat(makeChatRequest())).rejects.toThrow("GROK_API_KEY");
  });

  it("should have correct providerId", () => {
    const provider = new GrokProvider(apiKey, baseUrl, model);
    expect(provider.providerId).toBe("grok");
  });

  it("should handle server error gracefully", async () => {
    installFetchInterceptor(() => makeResponse("Internal Server Error", 500));

    const provider = new GrokProvider(apiKey, baseUrl, model);
    await expect(provider.chat(makeChatRequest())).rejects.toThrow(/500/);
  });
});

// ─── OpenAI Compatible Provider ──────────────────────────────────────────────

describe("OpenAIProvider", () => {
  const apiKey = "sk-openai-test-key";
  const baseUrl = "https://api.openai.com";
  const model = "gpt-4o";

  it("should make a successful chat call", async () => {
    installFetchInterceptor(() =>
      makeResponse(makeSuccessBody({ content: "OpenAI response", id: "chatcmpl-openai-1" }), 200),
    );

    const provider = new OpenAIProvider(apiKey, baseUrl, model);
    const response = await provider.chat(makeChatRequest());

    expect(response.content).toBe("OpenAI response");
    expect(response.id).toBe("chatcmpl-openai-1");
  });

  it("should throw when API key is empty", async () => {
    const provider = new OpenAIProvider("", baseUrl, model);
    await expect(provider.chat(makeChatRequest())).rejects.toThrow("OPENAI_API_KEY");
  });

  it("should have correct providerId", () => {
    const provider = new OpenAIProvider(apiKey, baseUrl, model);
    expect(provider.providerId).toBe("openai");
  });

  it("should handle missing usage in response (fallback to estimation)", async () => {
    installFetchInterceptor(() =>
      makeResponse(
        JSON.stringify({
          id: "cmpl-est",
          model: "gpt-4o",
          choices: [{ index: 0, message: { role: "assistant", content: "Hi" }, finish_reason: "stop" }],
        }),
        200,
      ),
    );

    const provider = new OpenAIProvider(apiKey, baseUrl, model);
    const response = await provider.chat(makeChatRequest());

    expect(response.usage.inputTokens).toBeGreaterThan(0);
    expect(response.usage.outputTokens).toBeGreaterThan(0);
  });
});

// ─── Custom Provider (user-defined endpoint) ─────────────────────────────────

describe("CustomProvider", () => {
  const apiKey = "user-custom-key-abc";
  const baseUrl = "https://my-custom-llm.example.com";
  const model = "custom-model-v2";

  it("should call the user-specified base URL", async () => {
    let calledUrl = "";
    installFetchInterceptor((url) => {
      calledUrl = url;
      return makeResponse(makeSuccessBody({ content: "Custom response" }), 200);
    });

    const provider = new CustomProvider(apiKey, baseUrl, model);
    const response = await provider.chat(makeChatRequest());

    expect(calledUrl).toBe("https://my-custom-llm.example.com/v1/chat/completions");
    expect(response.content).toBe("Custom response");
  });

  it("should throw when API key is empty", async () => {
    const provider = new CustomProvider("", baseUrl, model);
    await expect(provider.chat(makeChatRequest())).rejects.toThrow("Custom API key");
  });

  it("should have correct providerId", () => {
    const provider = new CustomProvider(apiKey, baseUrl, model);
    expect(provider.providerId).toBe("custom");
  });

  it("should pass through custom model name in request body", async () => {
    let requestBody: Record<string, unknown> = {};
    installFetchInterceptor((_url, init) => {
      const bodyStr = (init as RequestInit & { body: string }).body;
      if (bodyStr) {
        requestBody = JSON.parse(bodyStr) as Record<string, unknown>;
      }
      return makeResponse(makeSuccessBody(), 200);
    });

    const provider = new CustomProvider(apiKey, baseUrl, "my-special-model");
    await provider.chat(makeChatRequest());

    expect(requestBody.model).toBe("my-special-model");
  });

  it("should handle a 401 unauthorized response", async () => {
    installFetchInterceptor(() => makeResponse(makeErrorBody(401, "Invalid API key"), 401));

    const provider = new CustomProvider(apiKey, baseUrl, model);
    await expect(provider.chat(makeChatRequest())).rejects.toThrow(/401/);
  });

  it("should measure latency correctly", async () => {
    installFetchInterceptor(async () => {
      await new Promise((r) => setTimeout(r, 30));
      return makeResponse(makeSuccessBody(), 200);
    });

    const provider = new CustomProvider(apiKey, baseUrl, model);
    const response = await provider.chat(makeChatRequest());
    expect(response.latencyMs).toBeGreaterThanOrEqual(25);
  });
});
