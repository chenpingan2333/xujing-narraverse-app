import { describe, it, expect, beforeEach } from "vitest";
import { summarizeMemories } from "../memory-summarizer.js";
import { InMemoryStore } from "../memory-store.testdoubles.js";

describe("summarizeMemories", () => {
  let store: InMemoryStore;

  beforeEach(async () => {
    store = new InMemoryStore();

    await store.addEpisodic({
      id: "ep1", userId: "u1", characterId: "c1",
      eventType: "conversation", content: "讨论了周末计划",
      importance: 0.7, createdAt: Date.now() - 1000,
    });
    await store.addEpisodic({
      id: "ep2", userId: "u1", characterId: "c1",
      eventType: "emotional_shift", content: "角色表达了对未来的担忧",
      importance: 0.6, createdAt: Date.now() - 2000,
    });
    await store.addPromise({
      id: "p1", userId: "u1", characterId: "c1",
      direction: "character_to_user", content: "角色承诺永远支持你",
      status: "active", importance: 0.9, createdAt: Date.now() - 3000,
      resolvedAt: null,
    });
    await store.addRelationship({
      id: "r1", userId: "u1", characterId: "c1",
      deltaAffection: 5, deltaTrust: 3, deltaIntimacy: 2,
      reason: "深度对话增进了理解",
      importance: 0.5, createdAt: Date.now() - 4000,
    });
  });

  it("produces a summary for a user and character", async () => {
    const summary = await summarizeMemories(store, "u1", "c1");
    expect(summary.userId).toBe("u1");
    expect(summary.characterId).toBe("c1");
    expect(summary.sourceMemoryIds.length).toBeGreaterThan(0);
    expect(summary.summary).toContain("u1");
    expect(summary.summary).toContain("c1");
  });

  it("produces a summary without characterId", async () => {
    const summary = await summarizeMemories(store, "u1");
    expect(summary.characterId).toBeNull();
    expect(summary.summary).toContain("u1");
  });

  it("produces empty summary for empty store", async () => {
    const emptyStore = new InMemoryStore();
    const summary = await summarizeMemories(emptyStore, "u1", "c1");
    expect(summary.sourceMemoryIds).toEqual([]);
    expect(summary.summary.includes("暂无")).toBe(true);
  });

  it("respects maxInputMemories option", async () => {
    const summary = await summarizeMemories(store, "u1", "c1", {
      maxInputMemories: 1,
    });
    expect(summary.sourceMemoryIds.length).toBeLessThanOrEqual(1);
  });

  it("generates an id based on userId and characterId", async () => {
    const summary = await summarizeMemories(store, "u1", "c1");
    expect(summary.id).toContain("u1");
    expect(summary.id).toContain("c1");
  });

  it("formats episodic memory lines with expected structure", async () => {
    const summary = await summarizeMemories(store, "u1", "c1");
    expect(summary.summary.length).toBeGreaterThan(50);
  });

  it("formats promise memory lines with expected structure", async () => {
    const summary = await summarizeMemories(store, "u1", "c1");
    expect(summary.summary).toContain("承诺");
  });
});
