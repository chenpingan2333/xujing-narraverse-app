import type { LLMProvider, ChatRequest, ChatResponse, ProviderId } from "../provider.types.js";
import { estimateTokens, detectCacheHit } from "../token-estimator.js";

function buildAuthHeader(apiKey: string): string {
  return `Bearer ${apiKey}`;
}

async function makeOpenAICompatibleCall(
  baseUrl: string,
  apiKey: string,
  model: string,
  request: ChatRequest,
  providerId: ProviderId,
): Promise<ChatResponse> {
  const startTime = Date.now();

  const body = {
    model,
    messages: request.messages,
    temperature: request.temperature,
    max_tokens: request.maxTokens,
    stream: false,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: buildAuthHeader(apiKey),
  };

  const url = `${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Provider ${providerId} returned ${response.status}: ${errorText.slice(0, 200)}`,
    );
  }

  // Use optional fields so runtime safety checks are not flagged as unnecessary
  const data = (await response.json()) as {
    id?: string;
    model?: string;
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const latencyMs = Date.now() - startTime;
  const content = data.choices?.[0]?.message?.content ?? "";
  const inputTokens = data.usage?.prompt_tokens ?? estimateTokens(
    request.messages.map((m) => m.content).join("\n"),
  );
  const outputTokens =
    data.usage?.completion_tokens ?? estimateTokens(content);

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((v, k) => {
    responseHeaders[k] = v;
  });
  const cacheHit = detectCacheHit(responseHeaders);

  return {
    id: data.id ?? `${providerId}-${startTime.toString()}`,
    model,
    content,
    finishReason: (data.choices?.[0]?.finish_reason ?? "stop") as ChatResponse["finishReason"],
    usage: { inputTokens, outputTokens, cacheHit },
    latencyMs,
  };
}

// ─── DeepSeek Provider ───────────────────────────────────────────────────────

export class DeepSeekProvider implements LLMProvider {
  readonly providerId: ProviderId = "deepseek";

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new Error("DEEPSEEK_API_KEY is not configured");
    }
    return makeOpenAICompatibleCall(
      this.baseUrl,
      this.apiKey,
      this.model,
      request,
      "deepseek",
    );
  }
}

// ─── Grok (xAI) Provider ─────────────────────────────────────────────────────

export class GrokProvider implements LLMProvider {
  readonly providerId: ProviderId = "grok";

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new Error("GROK_API_KEY is not configured");
    }
    return makeOpenAICompatibleCall(
      this.baseUrl,
      this.apiKey,
      this.model,
      request,
      "grok",
    );
  }
}

// ─── OpenAI Compatible Provider ──────────────────────────────────────────────

export class OpenAIProvider implements LLMProvider {
  readonly providerId: ProviderId = "openai";

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    return makeOpenAICompatibleCall(
      this.baseUrl,
      this.apiKey,
      this.model,
      request,
      "openai",
    );
  }
}

// ─── Custom Provider (user-defined endpoint) ─────────────────────────────────

export class CustomProvider implements LLMProvider {
  readonly providerId: ProviderId = "custom";

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new Error("Custom API key is not configured");
    }
    return makeOpenAICompatibleCall(
      this.baseUrl,
      this.apiKey,
      this.model,
      request,
      "custom",
    );
  }
}
