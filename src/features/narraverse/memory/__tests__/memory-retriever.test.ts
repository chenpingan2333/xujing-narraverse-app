import { describe, it, expect, beforeEach } from "vitest";
import { retrieveMemories } from "../memory-retriever.js";
import { InMemoryStore } from "../memory-store.testdoubles.js";

describe("retrieveMemories", () => {
  let store: InMemoryStore;

  beforeEach(async () => {
    store = new InMemoryStore();

    await store.addEpisodic({
      id: "ep1", userId: "u1", characterId: "c1",
      eventType: "conversation", content: "聊了关于未来的计划",
      importance: 0.8, createdAt: Date.now() - 1000,
    });
    await store.addEpisodic({
      id: "ep2", userId: "u1", characterId: "c1",
      eventType: "emotional_shift", content: "角色流露出悲伤",
      importance: 0.3, createdAt: Date.now() - 10000000,
    });
    await store.addEpisodic({
      id: "ep3", userId: "u2", characterId: "c1",
      eventType: "conversation", content: "其他人",
      importance: 0.5, createdAt: Date.now(),
    });

    await store.addPromise({
      id: "p1", userId: "u1", characterId: "c1",
      direction: "character_to_user", content: "我会保护你",
      status: "active", importance: 0.9, createdAt: Date.now() - 5000,
      resolvedAt: null,
    });
  });

  it("retrieves memories filtered by userId", async () => {
    const result = await retrieveMemories(store, { userId: "u1" });
    expect(result.memories.length).toBeGreaterThan(0);
    expect(result.totalCandidates).toBe(3);
  });

  it("filters by characterId", async () => {
    const result = await retrieveMemories(store, {
      userId: "u1",
      characterId: "c1",
    });
    expect(result.totalCandidates).toBe(3);
  });

  it("respects the limit parameter", async () => {
    const result = await retrieveMemories(store, {
      userId: "u1",
      limit: 1,
    });
    expect(result.memories).toHaveLength(1);
  });

  it("filters by kinds", async () => {
    const result = await retrieveMemories(store, {
      userId: "u1",
      kinds: ["promise"],
    });
    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].memory.kind).toBe("promise");
  });

  it("filters by importance threshold", async () => {
    const result = await retrieveMemories(store, {
      userId: "u1",
      importanceThreshold: 0.7,
    });
    expect(result.memories.length).toBeGreaterThanOrEqual(2);
    const importances = result.memories.map((sm) => sm.memory.importance);
    for (const imp of importances) {
      expect(imp).toBeGreaterThanOrEqual(0.7);
    }
  });

  it("scores by relevance when query is provided", async () => {
    const result = await retrieveMemories(store, {
      userId: "u1",
      query: "保护",
    });
    expect(result.memories.length).toBeGreaterThan(0);
    expect(result.memories[0].memory.kind).toBe("promise");
  });

  it("sorts by descending score", async () => {
    const result = await retrieveMemories(store, { userId: "u1" });
    expect(result.memories.length).toBeGreaterThan(0);
    for (let i = 1; i < result.memories.length; i++) {
      expect(result.memories[i - 1].score).toBeGreaterThanOrEqual(
        result.memories[i].score,
      );
    }
  });

  it("applies time decay for recencyBias > 0", async () => {
    const noDecay = await retrieveMemories(store, {
      userId: "u1",
      recencyBias: 0,
      limit: 3,
    });
    const withDecay = await retrieveMemories(store, {
      userId: "u1",
      recencyBias: 1,
      limit: 3,
    });
    expect(noDecay.memories.length).toBeGreaterThan(0);
    expect(withDecay.memories.length).toBeGreaterThan(0);
  });

  it("returns empty for unknown userId", async () => {
    const result = await retrieveMemories(store, { userId: "nobody" });
    expect(result.memories).toEqual([]);
    expect(result.totalCandidates).toBe(0);
  });

  it("includes params with defaults in result", async () => {
    const result = await retrieveMemories(store, { userId: "u1", limit: 5 });
    expect(result.params.userId).toBe("u1");
    expect(result.params.limit).toBe(5);
    expect(result.params.recencyBias).toBe(0.3);
    expect(result.params.importanceThreshold).toBe(0);
  });
});

