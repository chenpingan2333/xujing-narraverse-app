import { describe, it, expect, beforeEach } from 'vitest';
import { MemorySafetyStore, ruleBasedSummary, safeSummarize } from '../memory-safety.js';
import { InMemoryStore } from '../../memory/memory-store.testdoubles.js';
import type { EpisodicMemory } from '../../memory/types.js';

describe('MemorySafetyStore', () => {
  let inner: InMemoryStore;
  let safe: MemorySafetyStore;

  beforeEach(() => {
    inner = new InMemoryStore();
    safe = new MemorySafetyStore(inner);
    safe.clearHashes();
  });

  it('passes through write + read', async () => {
    const mem: EpisodicMemory = {
      id: "ep-1", userId: "u1", characterId: "c1",
      eventType: "conversation", content: "hello world",
      importance: 0.5, createdAt: Date.now(),
    };
    await safe.addEpisodic(mem);
    const result = await safe.getEpisodic("u1", "c1");
    expect(result.length).toBe(1);
    expect(result[0].content).toBe("hello world");
  });

  it('deduplicates by content hash', async () => {
    const mem: EpisodicMemory = {
      id: "ep-1", userId: "u1", characterId: "c1",
      eventType: "conversation", content: "same content",
      importance: 0.5, createdAt: Date.now(),
    };
    const mem2: EpisodicMemory = {
      id: "ep-2", userId: "u1", characterId: "c1",
      eventType: "conversation", content: "same content",
      importance: 0.6, createdAt: Date.now() + 1,
    };
    await safe.addEpisodic(mem);
    await safe.addEpisodic(mem2);
    const result = await safe.getEpisodic("u1", "c1");
    expect(result.length).toBe(1);
  });
});

describe('ruleBasedSummary', () => {
  it('produces summary from episodic memories', () => {
    const episodic: EpisodicMemory[] = [
      { id: "e1", userId: "u1", characterId: "c1", eventType: "conversation", content: "今天天气很好", importance: 0.5, createdAt: Date.now() - 1000 },
      { id: "e2", userId: "u1", characterId: "c1", eventType: "conversation", content: "一起去散步", importance: 0.7, createdAt: Date.now() },
    ];
    const summary = ruleBasedSummary(episodic, "u1", "c1");
    expect(summary.userId).toBe("u1");
    expect(summary.characterId).toBe("c1");
    expect(summary.summary).toContain("今天天气很好");
    expect(summary.importance).toBeGreaterThan(0);
  });

  it('handles empty array', () => {
    const summary = ruleBasedSummary([], "u1", "c1");
    expect(summary.summary).toContain("尚未有记忆片段");
  });
});

describe('safeSummarize', () => {
  it('falls back to rule-based when no LLM provided', async () => {
    const store = new InMemoryStore();
    await store.addEpisodic({
      id: "e1", userId: "u1", characterId: "c1",
      eventType: "conversation", content: "test", importance: 0.5, createdAt: Date.now(),
    });
    const summary = await safeSummarize(store, "u1", "c1");
    expect(summary.userId).toBe("u1");
    expect(summary.summary).toBeTruthy();
  });

  it('returns empty summary for empty store', async () => {
    const store = new InMemoryStore();
    const summary = await safeSummarize(store, "u1", "c1");
    expect(summary.importance).toBe(0.3);
  });
});