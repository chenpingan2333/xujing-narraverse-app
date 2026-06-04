import { describe, it, expect, beforeEach } from "vitest";
import { runMemoryWriteback } from "../memory-writeback.js";
import { InMemoryStore } from "../../memory/memory-store.testdoubles.js";

describe("runMemoryWriteback", () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore();
  });

  const baseInput = {
    userId: "u1",
    characterId: "c1",
    relationshipDelta: { affection: 0, trust: 0, intimacy: 0, reason: "" },
  };

  it("extracts and saves episodic memories", async () => {
    const result = await runMemoryWriteback(store, {
      ...baseInput,
      messages: [
        {
          role: "user",
          content: "你好，今天的天气真不错，适合出去走走散散步。",
          timestamp: Date.now(),
        },
      ],
    });
    expect(result.episodicCount).toBeGreaterThan(0);
    const saved = await store.getEpisodic("u1", "c1");
    expect(saved.length).toBeGreaterThan(0);
  });

  it("extracts promise memories", async () => {
    const result = await runMemoryWriteback(store, {
      ...baseInput,
      messages: [
        {
          role: "character",
          content: "我答应你，以后每天都会陪着你。",
          timestamp: Date.now(),
        },
      ],
    });
    expect(result.promiseCount).toBeGreaterThan(0);
    const saved = await store.getPromises("u1", "c1");
    expect(saved.length).toBeGreaterThan(0);
    expect(saved[0].status).toBe("active");
  });

  it("extracts preference memories", async () => {
    const result = await runMemoryWriteback(store, {
      ...baseInput,
      messages: [
        {
          role: "user",
          content: "我从小就特别喜欢听音乐，尤其是古典音乐。",
          timestamp: Date.now(),
        },
      ],
    });
    expect(result.preferenceCount).toBeGreaterThan(0);
    const saved = await store.getPreferences("u1", "c1");
    expect(saved.length).toBeGreaterThan(0);
  });

  it("saves relationship delta as a memory record", async () => {
    const result = await runMemoryWriteback(store, {
      ...baseInput,
      messages: [],
      relationshipDelta: {
        affection: 5,
        trust: 3,
        intimacy: 2,
        reason: "Test delta",
      },
    });
    expect(result.relationshipCount).toBeGreaterThan(0);
  });

  it("skips relationship record when delta is zero", async () => {
    const result = await runMemoryWriteback(store, {
      ...baseInput,
      messages: [],
      relationshipDelta: { affection: 0, trust: 0, intimacy: 0, reason: "" },
    });
    expect(result.relationshipCount).toBe(0);
  });

  it("returns events matching extracted memories", async () => {
    const result = await runMemoryWriteback(store, {
      ...baseInput,
      messages: [
        {
          role: "character",
          content: "我保证永远不会离开你。",
          timestamp: Date.now(),
        },
      ],
    });
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events.some((e) => e.type === "promise")).toBe(true);
  });

  it("handles empty messages gracefully", async () => {
    const result = await runMemoryWriteback(store, {
      ...baseInput,
      messages: [],
    });
    expect(result.episodicCount).toBe(0);
    expect(result.events).toEqual([]);
  });
});
