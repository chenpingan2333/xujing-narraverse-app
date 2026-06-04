import { describe, it, expect } from "vitest";
import {
  EpisodicMemory as EpisodicMemorySchema,
  RelationshipMemory as RelationshipMemorySchema,
  PromiseMemory as PromiseMemorySchema,
  PreferenceMemory as PreferenceMemorySchema,
  Memory as MemorySchema,
  MemoryExtractionResult as MemoryExtractionResultSchema,
  MemoryRetrievalParams as MemoryRetrievalParamsSchema,
  MemorySummary as MemorySummarySchema,
} from "../types.js";

describe("Zod schemas", () => {
  const now = Date.now();

  describe("EpisodicMemory", () => {
    it("parses valid episodic memory", () => {
      const parsed = EpisodicMemorySchema.parse({
        id: "e1", userId: "u1", characterId: "c1",
        eventType: "conversation", content: "Hello",
        importance: 0.5, createdAt: now,
      });
      expect(parsed.content).toBe("Hello");
    });

    it("rejects importance > 1", () => {
      expect(() =>
        EpisodicMemorySchema.parse({
          id: "e1", userId: "u1", characterId: "c1",
          eventType: "conversation", content: "x",
          importance: 1.5, createdAt: now,
        }),
      ).toThrow();
    });

    it("rejects importance < 0", () => {
      expect(() =>
        EpisodicMemorySchema.parse({
          id: "e1", userId: "u1", characterId: "c1",
          eventType: "conversation", content: "x",
          importance: -0.1, createdAt: now,
        }),
      ).toThrow();
    });

    it("rejects invalid eventType", () => {
      expect(() =>
        EpisodicMemorySchema.parse({
          id: "e1", userId: "u1", characterId: "c1",
          eventType: "invalid", content: "x",
          importance: 0.5, createdAt: now,
        }),
      ).toThrow();
    });
  });

  describe("RelationshipMemory", () => {
    it("parses valid relationship memory", () => {
      const parsed = RelationshipMemorySchema.parse({
        id: "r1", userId: "u1", characterId: "c1",
        deltaAffection: 5, deltaTrust: 3, deltaIntimacy: 2,
        reason: "Shared moment",
        importance: 0.7, createdAt: now,
      });
      expect(parsed.deltaAffection).toBe(5);
    });
  });

  describe("PromiseMemory", () => {
    it("parses valid promise memory", () => {
      const parsed = PromiseMemorySchema.parse({
        id: "p1", userId: "u1", characterId: "c1",
        direction: "character_to_user", content: "I promise",
        status: "active", importance: 0.8,
        createdAt: now, resolvedAt: null,
      });
      expect(parsed.status).toBe("active");
    });

    it("parses resolved promise", () => {
      const parsed = PromiseMemorySchema.parse({
        id: "p1", userId: "u1", characterId: "c1",
        direction: "user_to_character", content: "I will",
        status: "fulfilled", importance: 0.5,
        createdAt: now, resolvedAt: now,
      });
      expect(parsed.status).toBe("fulfilled");
    });
  });

  describe("PreferenceMemory", () => {
    it("parses valid preference", () => {
      const parsed = PreferenceMemorySchema.parse({
        id: "pf1", userId: "u1", characterId: "c1",
        category: "food", content: "Likes spicy",
        importance: 0.4, createdAt: now,
      });
      expect(parsed.category).toBe("food");
    });
  });

  describe("Memory (discriminated union on kind)", () => {
    it("parses episodic memory", () => {
      const parsed = MemorySchema.parse({
        kind: "episodic",
        id: "e1", userId: "u1", characterId: "c1",
        eventType: "conversation", content: "Hello",
        importance: 0.5, createdAt: now,
      });
      expect(parsed.kind).toBe("episodic");
    });

    it("parses relationship memory", () => {
      const parsed = MemorySchema.parse({
        kind: "relationship",
        id: "r1", userId: "u1", characterId: "c1",
        deltaAffection: 1, deltaTrust: 1, deltaIntimacy: 1,
        reason: "test", importance: 0.5, createdAt: now,
      });
      expect(parsed.kind).toBe("relationship");
    });

    it("parses promise memory", () => {
      const parsed = MemorySchema.parse({
        kind: "promise",
        id: "p1", userId: "u1", characterId: "c1",
        direction: "character_to_user", content: "test",
        status: "active", importance: 0.5,
        createdAt: now, resolvedAt: null,
      });
      expect(parsed.kind).toBe("promise");
    });

    it("parses preference memory", () => {
      const parsed = MemorySchema.parse({
        kind: "preference",
        id: "pf1", userId: "u1", characterId: "c1",
        category: "food", content: "test",
        importance: 0.5, createdAt: now,
      });
      expect(parsed.kind).toBe("preference");
    });
  });

  describe("MemoryExtractionResult", () => {
    it("parses valid extraction result", () => {
      const parsed = MemoryExtractionResultSchema.parse({
        episodic: [],
        relationship: [],
        promises: [],
        preferences: [],
      });
      expect(parsed.episodic).toEqual([]);
    });
  });

  describe("MemoryRetrievalParams", () => {
    it("applies defaults", () => {
      const parsed = MemoryRetrievalParamsSchema.parse({ userId: "u1" });
      expect(parsed.limit).toBe(20);
      expect(parsed.recencyBias).toBe(0.3);
      expect(parsed.importanceThreshold).toBe(0);
    });

    it("rejects limit > 100", () => {
      expect(() =>
        MemoryRetrievalParamsSchema.parse({ userId: "u1", limit: 200 }),
      ).toThrow();
    });
  });

  describe("MemorySummary", () => {
    it("parses valid summary", () => {
      const parsed = MemorySummarySchema.parse({
        id: "s1", userId: "u1", characterId: "c1",
        summary: "Summary text",
        sourceMemoryIds: ["e1", "e2"],
        timeRange: { start: now - 1000, end: now },
        importance: 0.5, createdAt: now,
      });
      expect(parsed.summary).toBe("Summary text");
    });
  });
});
