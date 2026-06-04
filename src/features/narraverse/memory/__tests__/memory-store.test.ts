import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryStore } from "../memory-store.testdoubles.js";
import type { EpisodicMemory, RelationshipMemory, PromiseMemory, PreferenceMemory, MemorySummary } from "../types.js";

function makeEpisodic(overrides: Partial<EpisodicMemory> = {}): EpisodicMemory {
  return {
    id: "ep1",
    userId: "u1",
    characterId: "c1",
    eventType: "conversation",
    content: "Hello world",
    importance: 0.5,
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeRelationship(overrides: Partial<RelationshipMemory> = {}): RelationshipMemory {
  return {
    id: "r1",
    userId: "u1",
    characterId: "c1",
    deltaAffection: 5,
    deltaTrust: 2,
    deltaIntimacy: 3,
    reason: "Shared a deep conversation",
    importance: 0.6,
    createdAt: Date.now(),
    ...overrides,
  };
}

function makePromise(overrides: Partial<PromiseMemory> = {}): PromiseMemory {
  return {
    id: "p1",
    userId: "u1",
    characterId: "c1",
    direction: "character_to_user",
    content: "I promise to protect you",
    status: "active",
    importance: 0.8,
    createdAt: Date.now(),
    resolvedAt: null,
    ...overrides,
  };
}

function makePreference(overrides: Partial<PreferenceMemory> = {}): PreferenceMemory {
  return {
    id: "pref1",
    userId: "u1",
    characterId: "c1",
    category: "food",
    content: "Likes spicy food",
    importance: 0.4,
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeSummary(overrides: Partial<MemorySummary> = {}): MemorySummary {
  return {
    id: "s1",
    userId: "u1",
    characterId: "c1",
    summary: "Summary of events",
    sourceMemoryIds: ["ep1", "ep2"],
    timeRange: { start: Date.now() - 10000, end: Date.now() },
    importance: 0.5,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("InMemoryStore", () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore();
  });

  describe("addEpisodic / getEpisodic", () => {
    it("stores and retrieves episodic memories", async () => {
      const mem = makeEpisodic();
      await store.addEpisodic(mem);
      const result = await store.getEpisodic("u1");
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Hello world");
    });

    it("filters by userId", async () => {
      await store.addEpisodic(makeEpisodic({ userId: "u1" }));
      await store.addEpisodic(makeEpisodic({ id: "ep2", userId: "u2" }));
      const result = await store.getEpisodic("u1");
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe("u1");
    });

    it("filters by characterId", async () => {
      await store.addEpisodic(makeEpisodic({ characterId: "c1" }));
      await store.addEpisodic(makeEpisodic({ id: "ep2", characterId: "c2" }));
      const result = await store.getEpisodic("u1", "c1");
      expect(result).toHaveLength(1);
      expect(result[0].characterId).toBe("c1");
    });
  });

  describe("addRelationship / getRelationship", () => {
    it("stores and retrieves relationship memories", async () => {
      const mem = makeRelationship();
      await store.addRelationship(mem);
      const result = await store.getRelationship("u1");
      expect(result).toHaveLength(1);
      expect(result[0].deltaAffection).toBe(5);
    });

    it("returns empty array for unknown user", async () => {
      const result = await store.getRelationship("nobody");
      expect(result).toEqual([]);
    });
  });

  describe("addPromise / getPromises / updatePromise", () => {
    it("stores and retrieves promises", async () => {
      const mem = makePromise();
      await store.addPromise(mem);
      const result = await store.getPromises("u1");
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("active");
    });

    it("updates promise status", async () => {
      await store.addPromise(makePromise());
      await store.updatePromise("p1", "fulfilled", Date.now());
      const result = await store.getPromises("u1");
      expect(result[0].status).toBe("fulfilled");
      expect(result[0].resolvedAt).not.toBeNull();
    });

    it("ignores update for non-existent promise", async () => {
      await expect(
        store.updatePromise("nonexistent", "fulfilled", Date.now()),
      ).resolves.toBeUndefined();
    });
  });

  describe("addPreference / getPreferences", () => {
    it("stores and retrieves preferences", async () => {
      await store.addPreference(makePreference());
      const result = await store.getPreferences("u1");
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe("food");
    });
  });

  describe("addSummary / getSummaries", () => {
    it("stores and retrieves summaries", async () => {
      await store.addSummary(makeSummary());
      const result = await store.getSummaries("u1");
      expect(result).toHaveLength(1);
      expect(result[0].summary).toBe("Summary of events");
    });

    it("returns summaries with null characterId for character-specific queries", async () => {
      await store.addSummary(makeSummary({ characterId: null }));
      const result = await store.getSummaries("u1", "c1");
      expect(result).toHaveLength(1);
    });
  });

  describe("clear", () => {
    it("empties all stores", async () => {
      await store.addEpisodic(makeEpisodic());
      await store.addPromise(makePromise());
      store.clear();
      expect(store.size()).toBe(0);
    });
  });

  describe("size", () => {
    it("returns total count across all stores", async () => {
      await store.addEpisodic(makeEpisodic());
      await store.addRelationship(makeRelationship());
      await store.addPromise(makePromise());
      await store.addPreference(makePreference());
      await store.addSummary(makeSummary());
      expect(store.size()).toBe(5);
    });
  });
});

