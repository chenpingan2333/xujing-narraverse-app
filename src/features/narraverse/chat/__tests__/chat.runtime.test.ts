/* eslint-disable @typescript-eslint/require-await */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  CharacterService,
  RelationshipService,
  PromptBuilder,
  CharacterData,
  RelationshipData,
  PromptBuildResult,
} from "../chat.types.js";
import { runChat } from "../chat.runtime.js";
import { InMemoryStore } from "../../memory/memory-store.testdoubles.js";
import { InMemoryChatRepository } from "../chat.repository.js";
import type { ProviderGateway } from "../../provider/index.js";
import type { ChatResponse } from "../../provider/provider.types.js";

// ─── Test Doubles ────────────────────────────────────────────────────────────

function makeCharacter(overrides: Partial<CharacterData> = {}): CharacterData {
  return {
    id: "c1",
    userId: "u1",
    name: "Test Character",
    persona: "A helpful companion",
    description: "A test character for unit tests",
    config: {},
    ...overrides,
  };
}

function makeRelationship(overrides: Partial<RelationshipData> = {}): RelationshipData {
  return {
    userId: "u1",
    characterId: "c1",
    affection: 50,
    trust: 50,
    intimacy: 50,
    status: "active",
    ...overrides,
  };
}

function makePromptResult(overrides: Partial<PromptBuildResult> = {}): PromptBuildResult {
  return {
    systemPrompt: "You are a helpful character.",
    userPrompt: "Reply to the user.",
    messages: [{ role: "system", content: "You are a helpful character." }],
    ...overrides,
  };
}

function makeGatewayResponse(overrides: Partial<ChatResponse> = {}): ChatResponse {
  return {
    id: "deepseek-test-response-001",
    model: "deepseek-chat",
    content: "Hello! Nice to meet you.",
    finishReason: "stop",
    usage: { inputTokens: 10, outputTokens: 5, cacheHit: false },
    latencyMs: 100,
    ...overrides,
  };
}

function createTestCharacterService(char: CharacterData): CharacterService {
  return {
    getCharacter: async () => char,
  };
}

function createTestRelationshipService(rel: RelationshipData): RelationshipService {
  let current = { ...rel };
  return {
    getRelationship: async () => current,
    updateRelationship: async (_uid, _cid, deltas) => {
      current = {
        ...current,
        affection: current.affection + deltas.affection,
        trust: current.trust + deltas.trust,
        intimacy: current.intimacy + deltas.intimacy,
      };
      return current;
    },
  };
}

function createTestPromptBuilder(result: PromptBuildResult): PromptBuilder {
  return {
    buildPrompt: async () => result,
  };
}

/** Creates a ProviderGateway stub whose chat() returns a canned ChatResponse */
function createTestProviderGateway(response: ChatResponse): ProviderGateway {
  return {
    chat: vi.fn().mockResolvedValue(response),
  } as unknown as ProviderGateway;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("runChat (via ProviderGateway)", () => {
  let characterService: CharacterService;
  let relationshipService: RelationshipService;
  let promptBuilder: PromptBuilder;
  let providerGateway: ProviderGateway;
  let memoryStore: InMemoryStore;
  let chatRepository: InMemoryChatRepository;

  beforeEach(() => {
    memoryStore = new InMemoryStore();
    chatRepository = new InMemoryChatRepository();
    characterService = createTestCharacterService(makeCharacter());
    relationshipService = createTestRelationshipService(makeRelationship());
    promptBuilder = createTestPromptBuilder(makePromptResult());
    providerGateway = createTestProviderGateway(makeGatewayResponse());
  });

  it("returns assistant message via ProviderGateway", async () => {
    const result = await runChat(
      { characterService, relationshipService, promptBuilder, providerGateway, memoryStore, chatRepository },
      { userId: "u1", characterId: "c1", message: "Hello", sessionId: "s1", isVip: true },
    );
    expect(result.assistantMessage).toBe("Hello! Nice to meet you.");
  });

  it("includes metadata from Gateway response", async () => {
    const result = await runChat(
      { characterService, relationshipService, promptBuilder, providerGateway, memoryStore, chatRepository },
      { userId: "u1", characterId: "c1", message: "Hello", sessionId: "s1", isVip: true },
    );
    expect(result.metadata.sessionId).toBe("s1");
    expect(result.metadata.modelId).toBe("deepseek-chat");
    expect(result.metadata.provider).toBe("deepseek");
    expect(result.metadata.tier).toBe("vip");
    expect(result.metadata.latencyMs).toBe(100);
    expect(result.metadata.inputTokens).toBe(10);
    expect(result.metadata.outputTokens).toBe(5);
  });

  it("saves user and assistant messages to repository", async () => {
    await runChat(
      { characterService, relationshipService, promptBuilder, providerGateway, memoryStore, chatRepository },
      { userId: "u1", characterId: "c1", message: "Hello", sessionId: "s1", isVip: true },
    );
    const messages = await chatRepository.getSessionMessages("s1");
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("user");
    expect(messages[1].role).toBe("assistant");
  });

  it("extracts and persists memories from promise messages", async () => {
    const result = await runChat(
      { characterService, relationshipService, promptBuilder, providerGateway, memoryStore, chatRepository },
      { userId: "u1", characterId: "c1", message: "我答应你以后每天都会来", sessionId: "s1", isVip: true },
    );
    expect(result.memoryEvents.length).toBeGreaterThan(0);
  });

  it("detects and applies compliment relationship delta", async () => {
    const result = await runChat(
      { characterService, relationshipService, promptBuilder, providerGateway, memoryStore, chatRepository },
      { userId: "u1", characterId: "c1", message: "你真厉害", sessionId: "s1", isVip: true },
    );
    expect(result.relationshipDelta.affection).toBeGreaterThan(0);
  });

  it("returns zero relationship delta for neutral messages", async () => {
    providerGateway = createTestProviderGateway(makeGatewayResponse({ content: "ok" }));
    const result = await runChat(
      { characterService, relationshipService, promptBuilder, providerGateway, memoryStore, chatRepository },
      { userId: "u1", characterId: "c1", message: "ok", sessionId: "s1", isVip: true },
    );
    expect(Math.abs(result.relationshipDelta.affection)).toBeLessThanOrEqual(0);
  });

  it("routes free users with correct tier metadata", async () => {
    const result = await runChat(
      { characterService, relationshipService, promptBuilder, providerGateway, memoryStore, chatRepository },
      { userId: "u1", characterId: "c1", message: "Hello", sessionId: "s2", isVip: false },
    );
    expect(result.metadata.tier).toBe("free");
  });
});
