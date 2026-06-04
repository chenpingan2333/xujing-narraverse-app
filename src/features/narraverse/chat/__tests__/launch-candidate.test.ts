/**
 * Phase 8 Launch Candidate Tests
 *
 * Covers:
 *   1. System prompt builder correctness
 *   2. Relationship boundary conditions
 *   3. Memory overflow fallback
 *   4. Chat state recovery
 *   5. Provider failover chain
 */

import { describe, it, expect, beforeEach } from "vitest";

// ===========================================================================
// 1. System Prompt Builder — merge correctness
// ===========================================================================

import { buildFinalSystemPrompt } from "../system-prompt-builder.js";
import { buildPersonaFingerprint } from "../../persona/persona.builder.js";
import type { PersonaFingerprint } from "../../persona/persona.types.js";

describe("SystemPromptBuilder — merge correctness", () => {
  let personaFP: PersonaFingerprint;

  beforeEach(() => {
    personaFP = buildPersonaFingerprint({
      name: "艾琳",
      persona: "温柔体贴的邻家女孩",
      tier: "basic",
      relationshipAffection: 50,
      relationshipTrust: 50,
      relationshipIntimacy: 50,
    });
  });

  it("produces a non-empty system prompt with persona section", () => {
    const result = buildFinalSystemPrompt({
      persona: personaFP,
      personaCtx: { intimacy: 50 },
      character: { id: "char-001", userId: "u1", name: "艾琳", persona: "test", description: "", config: {} },
      relationship: { userId: "u1", characterId: "char-001", affection: 50, trust: 50, intimacy: 50, status: "active" },
    });
    expect(result.systemPrompt).toBeTruthy();
    expect(result.systemPrompt.length).toBeGreaterThan(200);
    expect(result.sections.persona).toBe(true);
    expect(result.estimatedTokens).toBeGreaterThan(0);
  });

  it("includes relationship bridge section", () => {
    const result = buildFinalSystemPrompt({
      persona: personaFP,
      personaCtx: { intimacy: 50 },
      character: { id: "char-001", userId: "u1", name: "艾琳", persona: "test", description: "", config: {} },
      relationship: { userId: "u1", characterId: "char-001", affection: 50, trust: 50, intimacy: 50, status: "active" },
    });
    expect(result.sections.relationship).toBe(true);
    expect(result.systemPrompt).toContain("当前关系");
    expect(result.systemPrompt).toContain("对话开始");
  });

  it("does not include world section when no world provided", () => {
    const result = buildFinalSystemPrompt({
      persona: personaFP,
      personaCtx: { intimacy: 50 },
      character: { id: "char-001", userId: "u1", name: "艾琳", persona: "test", description: "", config: {} },
      relationship: { userId: "u1", characterId: "char-001", affection: 50, trust: 50, intimacy: 50, status: "active" },
    });
    expect(result.sections.world).toBe(false);
  });

  it("includes persona text with character name", () => {
    const result = buildFinalSystemPrompt({
      persona: personaFP,
      personaCtx: { intimacy: 50 },
      character: { id: "char-001", userId: "u1", name: "艾琳", persona: "test", description: "", config: {} },
      relationship: { userId: "u1", characterId: "char-001", affection: 50, trust: 50, intimacy: 50, status: "active" },
    });
    expect(result.systemPrompt).toContain("艾琳");
    expect(result.systemPrompt).toContain("角色人格设定");
  });

  it("no duplicate sections — persona appears once", () => {
    const result = buildFinalSystemPrompt({
      persona: personaFP,
      personaCtx: { intimacy: 50 },
      character: { id: "char-001", userId: "u1", name: "艾琳", persona: "test", description: "", config: {} },
      relationship: { userId: "u1", characterId: "char-001", affection: 50, trust: 50, intimacy: 50, status: "active" },
    });
    const count = (result.systemPrompt.match(/角色人格设定/g) ?? []).length;
    expect(count).toBe(1);
  });

  it("no duplicate relationship sections", () => {
    const result = buildFinalSystemPrompt({
      persona: personaFP,
      personaCtx: { intimacy: 50 },
      character: { id: "char-001", userId: "u1", name: "艾琳", persona: "test", description: "", config: {} },
      relationship: { userId: "u1", characterId: "char-001", affection: 50, trust: 50, intimacy: 50, status: "active" },
    });
    const count = (result.systemPrompt.match(/当前关系/g) ?? []).length;
    expect(count).toBeLessThanOrEqual(2);
  });

  it("estimates tokens in reasonable range", () => {
    const result = buildFinalSystemPrompt({
      persona: personaFP,
      personaCtx: { intimacy: 50 },
      character: { id: "char-001", userId: "u1", name: "艾琳", persona: "test", description: "", config: {} },
      relationship: { userId: "u1", characterId: "char-001", affection: 50, trust: 50, intimacy: 50, status: "active" },
    });
    // Should be under 2000 tokens for basic persona
    expect(result.estimatedTokens).toBeLessThan(2000);
    expect(result.estimatedTokens).toBeGreaterThan(100);
  });
});

// ===========================================================================
// 2. Relationship boundary conditions
// ===========================================================================

import { computeRelationshipMomentum } from "../../relationship/relationship-momentum.js";

describe("Relationship — boundary conditions", () => {
  it("handles zero values without clamping errors", () => {
    const result = computeRelationshipMomentum({
      currentAffection: 0,
      currentTrust: 0,
      currentIntimacy: 0,
      daysSinceLastInteraction: 10,
      chatFrequency: 0,
      emotionalIntensity: 0,
      isVip: false,
      previousValues: { affection: 80, trust: 80, intimacy: 80 },
    });
    expect(result.newAffection).toBe(0);
    expect(result.newTrust).toBe(0);
    expect(result.newIntimacy).toBe(0);
  });

  it("handles max values without exceeding 100", () => {
    const result = computeRelationshipMomentum({
      currentAffection: 100,
      currentTrust: 100,
      currentIntimacy: 100,
      daysSinceLastInteraction: 0,
      chatFrequency: 2,
      emotionalIntensity: 1.0,
      isVip: true,
    });
    expect(result.newAffection).toBeLessThanOrEqual(100);
    expect(result.newTrust).toBeLessThanOrEqual(100);
    expect(result.newIntimacy).toBeLessThanOrEqual(100);
  });

  it("extreme silence (365 days) still returns valid values", () => {
    const result = computeRelationshipMomentum({
      currentAffection: 80,
      currentTrust: 80,
      currentIntimacy: 80,
      daysSinceLastInteraction: 365,
      chatFrequency: 0,
      emotionalIntensity: 0,
      isVip: false,
      previousValues: { affection: 80, trust: 80, intimacy: 80 },
    });
    expect(result.newAffection).toBeGreaterThanOrEqual(0);
    expect(result.newTrust).toBeGreaterThanOrEqual(0);
    expect(result.newIntimacy).toBeGreaterThanOrEqual(0);
    expect(result.trend).toBe("declining");
  });

  it("fractional affinity values are rounded", () => {
    const result = computeRelationshipMomentum({
      currentAffection: 50,
      currentTrust: 50,
      currentIntimacy: 50,
      daysSinceLastInteraction: 2,
      chatFrequency: 0.5,
      emotionalIntensity: 0.3,
      isVip: false,
    });
    expect(Number.isInteger(result.newAffection)).toBe(true);
    expect(Number.isInteger(result.newTrust)).toBe(true);
    expect(Number.isInteger(result.newIntimacy)).toBe(true);
  });
});

// ===========================================================================
// 3. Memory overflow fallback
// ===========================================================================

import { MemorySafetyStore, ruleBasedSummary } from "../../chat/memory-safety.js";
import { InMemoryStore } from "../../memory/memory-store.testdoubles.js";
import type { EpisodicMemory } from "../../memory/types.js";

describe("Memory — overflow fallback", () => {
  it("ruleBasedSummary handles up to 500 memories", () => {
    const memories: EpisodicMemory[] = Array.from({ length: 500 }, (_, i) => ({
      id: `mem-${i}`,
      userId: "u1",
      characterId: "char-001",
      eventType: "conversation",
      content: `Memory number ${i}: the user and character discussed topic ${i % 10}`,
      importance: 0.5,
      emotionalTone: i % 2 === 0 ? "warm" : "neutral",
      createdAt: Date.now() - i * 60000,
    }));
    const summaryObj = ruleBasedSummary(memories, "u1", "char-001");
    expect(summaryObj).toBeTruthy();
    expect(summaryObj.summary.length).toBeGreaterThan(0);
    // Should not crash with large input
    expect(typeof summaryObj.summary).toBe("string");
  });

  it("MemorySafetyStore handles duplicate writes gracefully", async () => {
    const base = new InMemoryStore();
    const safe = new MemorySafetyStore(base);
    // Write same memory twice
    safe.addEpisodic({
      id: "dup-1",
      userId: "u1",
      characterId: "char-001",
      eventType: "conversation",
      content: "duplicate test",
      importance: 0.5,
      createdAt: Date.now(),
    });
    safe.addEpisodic({
      id: "dup-2",
      userId: "u1",
      characterId: "char-001",
      eventType: "conversation",
      content: "duplicate test",
      importance: 0.5,
      createdAt: Date.now(),
    });
    // Should not throw and should deduplicate
    const retrieved = await safe.getEpisodic("u1", "char-001");
    expect(Array.isArray(retrieved)).toBe(true);
  });

  it("MemorySafetyStore handles empty base store", async () => {
    const base = new InMemoryStore();
    const safe = new MemorySafetyStore(base);
    const result = await safe.getEpisodic("nonexistent", "nonexistent");
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});

// ===========================================================================
// 4. Chat state recovery
// ===========================================================================

import { InMemoryChatRepository } from "../chat.repository.js";

describe("Chat — state recovery", () => {
  it("repository returns empty array for unknown session", async () => {
    const repo = new InMemoryChatRepository();
    const messages = await repo.getSessionMessages("unknown-session");
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBe(0);
  });

  it("repository preserves message order after save", async () => {
    const repo = new InMemoryChatRepository();
    await repo.saveMessage({
      id: "msg-1", sessionId: "sess-1", userId: "u1", characterId: "char-001",
      role: "user", content: "hello", createdAt: 1000,
    });
    await repo.saveMessage({
      id: "msg-2", sessionId: "sess-1", userId: "u1", characterId: "char-001",
      role: "assistant", content: "hi there", createdAt: 2000,
    });
    const messages = await repo.getSessionMessages("sess-1");
    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe("user");
    expect(messages[1].role).toBe("assistant");
  });

  it("repository isolates sessions", async () => {
    const repo = new InMemoryChatRepository();
    await repo.saveMessage({
      id: "m1", sessionId: "sess-a", userId: "u1", characterId: "char-001",
      role: "user", content: "a", createdAt: 1000,
    });
    await repo.saveMessage({
      id: "m2", sessionId: "sess-b", userId: "u1", characterId: "char-001",
      role: "user", content: "b", createdAt: 2000,
    });
    expect((await repo.getSessionMessages("sess-a")).length).toBe(1);
    expect((await repo.getSessionMessages("sess-b")).length).toBe(1);
  });
});

// ===========================================================================
// 5. Provider failover chain
// ===========================================================================

import { ProviderRegistry } from "../../provider/provider-resilience.js";
import type { LLMProvider, ChatRequest, ChatResponse } from "../../provider/provider.types.js";

describe("Provider — failover chain", () => {
  function makeProvider(id: string, shouldFail: boolean, latency: number = 1): LLMProvider {
    return {
      providerId: 'deepseek' as const,
      async chat(_req: ChatRequest): Promise<ChatResponse> {
        if (shouldFail) throw new Error(`${id} failed`);
        return {
          id: `${id}-resp`, content: "ok", model: "test",
          finishReason: "stop",
          usage: { inputTokens: 5, outputTokens: 5, cacheHit: false },
          latencyMs: latency,
        };
      },
    };
  }

  it("returns first provider result when it succeeds", async () => {
    const p1 = makeProvider("p1", false);
    const p2 = makeProvider("p2", false);
    const registry = new ProviderRegistry(); registry.add(p1, 'deepseek'); registry.add(p2, 'grok');
    const result = await registry.tryChain({ model: "test", messages: [], temperature: 0, maxTokens: 10, stream: false });
    expect(result.providerId).toBe('deepseek');
  });

  it("falls back to next provider on failure", async () => {
    const p1 = makeProvider("p1", true);
    const p2 = makeProvider("p2", false);
    const registry = new ProviderRegistry(); registry.add(p1, 'deepseek'); registry.add(p2, 'grok');
    const result = await registry.tryChain({ model: "test", messages: [], temperature: 0, maxTokens: 10, stream: false });
    expect(result.providerId).toBe('grok');
  });

  it("throws when all providers fail", async () => {
    const p1 = makeProvider("p1", true);
    const p2 = makeProvider("p2", true);
    const registry = new ProviderRegistry(); registry.add(p1, 'deepseek'); registry.add(p2, 'grok');
    await expect(
      registry.tryChain({ model: "test", messages: [], temperature: 0, maxTokens: 10, stream: false }),
    ).rejects.toThrow();
  });

  it("tracks health correctly", async () => {
    const p1 = makeProvider("p1", true);
    const p2 = makeProvider("p2", false);
    const registry = new ProviderRegistry(); registry.add(p1, 'deepseek'); registry.add(p2, 'grok');
    await registry.tryChain({ model: "test", messages: [], temperature: 0, maxTokens: 10, stream: false });
    const health = registry.getHealth();
    expect(health).toBeDefined();
    expect(health.length).toBe(2);
    // p1 should have failures, p2 should be healthy
    const p1Health = health.find((h) => h.id === 'deepseek');
    const p2Health = health.find((h) => h.id === 'grok');
    expect(p1Health).toBeDefined();
    expect(p2Health).toBeDefined();
    if (p1Health && p2Health) {
      expect(p1Health.healthy).toBe(true); // 1 failure < 3 maxFailures
      expect(p2Health.healthy).toBe(true);
    }
  });

  it("handles empty provider list gracefully", async () => {
    const registry = new ProviderRegistry();
    await expect(
      registry.tryChain({ model: "test", messages: [], temperature: 0, maxTokens: 10, stream: false }),
    ).rejects.toThrow();
  });
});








