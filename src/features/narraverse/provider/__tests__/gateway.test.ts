/* eslint-disable @typescript-eslint/require-await */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ProviderGateway } from "../provider.gateway.js";
import { NarraverseRouter } from "../router.js";
import { InMemoryApiKeyRepository, InMemoryUsageRepository } from "../provider.repos.js";
import { DeepSeekProvider, GrokProvider } from "../providers/provider-impls.js";
import { encryptApiKey } from "../key-encryption.js";
import type { ProviderId, LLMProvider, ApiKeyRepository, UsageRepository } from "../provider.types.js";

const ENCRYPTION_KEY = "gateway-test-encryption-key-32char";

// ─── Fetch Interception ──────────────────────────────────────────────────────

let _fetchInterceptor: ((url: string, init?: RequestInit) => Promise<Response>) | null = null;

beforeEach(() => {
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
    if (_fetchInterceptor) return _fetchInterceptor(url, init);
    throw new Error("fetch called without interceptor installed");
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  _fetchInterceptor = null;
});

function installInterceptor(handler: (url: string, init?: RequestInit) => Response): void {
  _fetchInterceptor = async (url, init) => handler(url, init);
}

function successResponse(content = "Gateway response"): Response {
  return new Response(
    JSON.stringify({
      id: "gw-chatcmpl",
      model: "test-model",
      choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
      usage: { prompt_tokens: 20, completion_tokens: 8, total_tokens: 28 },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

// ─── Gateway Builder ─────────────────────────────────────────────────────────

function makeGateway(opts: {
  platformProviders?: Map<ProviderId, LLMProvider>;
  apiKeyRepo?: ApiKeyRepository;
  usageRepo?: UsageRepository;
  router?: NarraverseRouter;
} = {}): ProviderGateway {
  const apiKeyRepo = opts.apiKeyRepo ?? new InMemoryApiKeyRepository();
  const usageRepo = opts.usageRepo ?? new InMemoryUsageRepository();
  const router = opts.router ?? new NarraverseRouter({
    defaultFreeModel: "deepseek",
    defaultVipModel: "deepseek",
    premiumModel: "grok",
    encryptionKey: ENCRYPTION_KEY,
    apiKeyRepo,
  });
  const platformProviders = opts.platformProviders ?? new Map<ProviderId, LLMProvider>([
    ["deepseek", new DeepSeekProvider("sk-platform-deepseek", "https://api.deepseek.com", "deepseek-chat")],
    ["grok", new GrokProvider("sk-platform-grok", "https://api.x.ai", "grok-4-fast")],
  ]);

  return new ProviderGateway({
    platformProviders,
    apiKeyRepo,
    usageRepo,
    router,
    encryptionKey: ENCRYPTION_KEY,
  });
}

// ─── VIP Platform Routing ────────────────────────────────────────────────────

describe("ProviderGateway — VIP Platform Routing", () => {
  it("should call DeepSeek for standard VIP user", async () => {
    let calledUrl = "";
    installInterceptor((url) => {
      calledUrl = url;
      return successResponse("Hello VIP user");
    });

    const gateway = makeGateway();
    const result = await gateway.chat({
      userId: "vip-u1",
      isVip: true,
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(calledUrl).toContain("api.deepseek.com");
    expect(result.content).toBe("Hello VIP user");
    expect(result.model).toBe("deepseek-chat");
  });

  it("should call Grok for premium (romantic) VIP user", async () => {
    let calledUrl = "";
    installInterceptor((url) => {
      calledUrl = url;
      return successResponse("Premium romantic response");
    });

    const gateway = makeGateway();
    const result = await gateway.chat({
      userId: "premium-u2",
      isVip: true,
      relationshipStatus: "romantic",
      messages: [{ role: "user", content: "I love you" }],
    });

    expect(calledUrl).toContain("api.x.ai");
    expect(result.content).toBe("Premium romantic response");
  });
});

// ─── Free User Custom Key ────────────────────────────────────────────────────

describe("ProviderGateway — Free User Custom Key", () => {
  it("should resolve user key and call custom provider", async () => {
    const apiKeyRepo = new InMemoryApiKeyRepository();
    const router = new NarraverseRouter({
      defaultFreeModel: "deepseek",
      defaultVipModel: "deepseek",
      premiumModel: "grok",
      encryptionKey: ENCRYPTION_KEY,
      apiKeyRepo,
    });

    const userApiKey = "sk-user-personal-key-abc";
    const encrypted = encryptApiKey(userApiKey, ENCRYPTION_KEY);
    await apiKeyRepo.saveKey({
      id: "k1",
      userId: "free-u1",
      provider: "deepseek",
      apiKeyEncrypted: encrypted,
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-chat",
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    let calledUrl = "";
    let authHeader = "";
    installInterceptor((url, init) => {
      calledUrl = url;
      authHeader = (init?.headers as Record<string, string | undefined>).Authorization ?? '';
      return successResponse("Free user response");
    });

    const gateway = makeGateway({ apiKeyRepo, router });
    const result = await gateway.chat({
      userId: "free-u1",
      isVip: false,
      messages: [{ role: "user", content: "Hello from free tier" }],
    });

    expect(calledUrl).toContain("api.deepseek.com");
    expect(authHeader).toBe(`Bearer ${userApiKey}`);
    expect(result.content).toBe("Free user response");
  });

  it("should throw when free user has no API key", async () => {
    const gateway = makeGateway();
    await expect(
      gateway.chat({
        userId: "no-key-user",
        isVip: false,
        messages: [{ role: "user", content: "Hi" }],
      }),
    ).rejects.toThrow("No API key configured");
  });

  it("should throw when free user key is disabled", async () => {
    const apiKeyRepo = new InMemoryApiKeyRepository();
    await apiKeyRepo.saveKey({
      id: "k-disabled",
      userId: "free-u2",
      provider: "deepseek",
      apiKeyEncrypted: encryptApiKey("sk-disabled", ENCRYPTION_KEY),
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-chat",
      enabled: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const router = new NarraverseRouter({
      defaultFreeModel: "deepseek",
      defaultVipModel: "deepseek",
      premiumModel: "grok",
      encryptionKey: ENCRYPTION_KEY,
      apiKeyRepo,
    });

    const gateway = makeGateway({ apiKeyRepo, router });
    await expect(
      gateway.chat({
        userId: "free-u2",
        isVip: false,
        messages: [{ role: "user", content: "Hi" }],
      }),
    ).rejects.toThrow("No API key configured");
  });
});

// ─── Usage Tracking ──────────────────────────────────────────────────────────

describe("ProviderGateway — Usage Tracking", () => {
  it("should record usage after each chat call", async () => {
    const usageRepo = new InMemoryUsageRepository();
    installInterceptor(() => successResponse("Track me"));

    const gateway = makeGateway({ usageRepo });
    await gateway.chat({
      userId: "usage-u1",
      isVip: true,
      messages: [{ role: "user", content: "Test" }],
    });

    const history = await usageRepo.getUsageHistory("usage-u1", 10);
    expect(history).toHaveLength(1);
    expect(history[0].provider).toBe("deepseek");
    expect(history[0].inputTokens).toBe(20);
    expect(history[0].outputTokens).toBe(8);
    expect(history[0].cost).toBeGreaterThanOrEqual(0);
  });

  it("should track usage for premium calls as well", async () => {
    const usageRepo = new InMemoryUsageRepository();
    installInterceptor(() => successResponse("Premium tracked"));

    const gateway = makeGateway({ usageRepo });
    await gateway.chat({
      userId: "prem-u1",
      isVip: true,
      relationshipStatus: "romantic",
      messages: [{ role: "user", content: "Romantic message" }],
    });

    const history = await usageRepo.getUsageHistory("prem-u1", 10);
    expect(history).toHaveLength(1);
    expect(history[0].provider).toBe("grok");
  });

  it("should record multiple calls sequentially", async () => {
    const usageRepo = new InMemoryUsageRepository();
    installInterceptor(() => successResponse("Batch"));

    const gateway = makeGateway({ usageRepo });
    await gateway.chat({ userId: "batch-u1", isVip: true, messages: [{ role: "user", content: "A" }] });
    await gateway.chat({ userId: "batch-u1", isVip: true, messages: [{ role: "user", content: "B" }] });
    await gateway.chat({ userId: "batch-u1", isVip: true, messages: [{ role: "user", content: "C" }] });

    const history = await usageRepo.getUsageHistory("batch-u1", 10);
    expect(history).toHaveLength(3);
  });

  it("should get monthly usage summary correctly", async () => {
    const usageRepo = new InMemoryUsageRepository();
    installInterceptor(() => successResponse("Monthly"));

    const gateway = makeGateway({ usageRepo });
    await gateway.chat({ userId: "month-u1", isVip: true, messages: [{ role: "user", content: "M1" }] });
    await gateway.chat({ userId: "month-u1", isVip: true, messages: [{ role: "user", content: "M2" }] });

    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthly = await usageRepo.getMonthlyUsage("month-u1", yearMonth);

    expect(monthly).not.toBeNull();
    expect(monthly?.requestCount).toBe(2);
    expect(monthly?.totalTokens).toBe(28 * 2); // 20 + 8 per call
    expect(monthly?.totalCost ?? 0).toBeGreaterThanOrEqual(0);
  });
});

// ─── Error Handling ──────────────────────────────────────────────────────────

describe("ProviderGateway — Error Handling", () => {
  it("should propagate provider errors", async () => {
    installInterceptor(() => new Response(
      JSON.stringify({ error: { message: "Server error", type: "server_error" } }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    ));

    const gateway = makeGateway();
    await expect(
      gateway.chat({ userId: "err-u1", isVip: true, messages: [{ role: "user", content: "Boom" }] }),
    ).rejects.toThrow(/500/);
  });

  it("should throw when platform provider is not configured", async () => {
    // Only register deepseek as platform provider
    const providers = new Map<ProviderId, LLMProvider>([
      ["deepseek", new DeepSeekProvider("sk", "https://api.deepseek.com", "deepseek-chat")],
    ]);
    installInterceptor(() => successResponse("ok"));

    const gateway = makeGateway({ platformProviders: providers });
    // This user triggers premium routing → grok, which is not in the map
    await expect(
      gateway.chat({
        userId: "no-grok",
        isVip: true,
        relationshipStatus: "romantic",
        messages: [{ role: "user", content: "Hi" }],
      }),
    ).rejects.toThrow(/not configured/);
  });
});

