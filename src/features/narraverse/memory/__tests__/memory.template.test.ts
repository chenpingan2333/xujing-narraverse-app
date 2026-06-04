import { describe, it, expect, beforeEach } from "vitest";
import { buildMemoryContext, renderMemoryPrompt } from "../memory.template.js";
import { InMemoryStore } from "../memory-store.testdoubles.js";
import type { MemoryTemplateContext } from "../memory.template.js";

describe("buildMemoryContext", () => {
  let store: InMemoryStore;

  beforeEach(async () => {
    store = new InMemoryStore();

    await store.addPromise({
      id: "p1", userId: "u1", characterId: "c1",
      direction: "character_to_user", content: "我会永远保护你",
      status: "active", importance: 0.9, createdAt: Date.now(),
      resolvedAt: null,
    });
    await store.addPromise({
      id: "p2", userId: "u1", characterId: "c1",
      direction: "user_to_character", content: "我会每天给你写信",
      status: "active", importance: 0.8, createdAt: Date.now(),
      resolvedAt: null,
    });
    await store.addPromise({
      id: "p3", userId: "u1", characterId: "c1",
      direction: "character_to_user", content: "已经完成的事",
      status: "fulfilled", importance: 0.3, createdAt: Date.now() - 10000,
      resolvedAt: Date.now(),
    });

    await store.addEpisodic({
      id: "ep1", userId: "u1", characterId: "c1",
      eventType: "conversation", content: "第一次见面",
      importance: 0.9, createdAt: Date.now() - 1000,
    });

    await store.addRelationship({
      id: "r1", userId: "u1", characterId: "c1",
      deltaAffection: 10, deltaTrust: 5, deltaIntimacy: 3,
      reason: "深入的交流让两人关系更近",
      importance: 0.7, createdAt: Date.now() - 2000,
    });

    await store.addPreference({
      id: "pref1", userId: "u1", characterId: "c1",
      category: "food", content: "喜欢辣的食物",
      importance: 0.5, createdAt: Date.now() - 3000,
    });
  });

  it("builds context with character promises", async () => {
    const ctx = await buildMemoryContext(store, "u1", "c1");
    expect(ctx.characterPromises).toContain("我会永远保护你");
    expect(ctx.characterPromises).not.toContain("已经完成的事");
  });

  it("builds context with user promises", async () => {
    const ctx = await buildMemoryContext(store, "u1", "c1");
    expect(ctx.userPromises).toContain("我会每天给你写信");
  });

  it("includes recent events", async () => {
    const ctx = await buildMemoryContext(store, "u1", "c1");
    expect(ctx.recentEvents.length).toBeGreaterThan(0);
    expect(ctx.recentEvents.some((e) => e.includes("第一次见面"))).toBe(true);
  });

  it("includes relationship history", async () => {
    const ctx = await buildMemoryContext(store, "u1", "c1");
    expect(ctx.relationshipHistory.length).toBeGreaterThan(0);
    expect(ctx.relationshipHistory.some((r) => r.includes("深入的交流"))).toBe(true);
  });

  it("includes long-term summary", async () => {
    const ctx = await buildMemoryContext(store, "u1", "c1");
    expect(ctx.longTermSummary.length).toBeGreaterThan(0);
  });
});

describe("renderMemoryPrompt", () => {
  const fullContext: MemoryTemplateContext = {
    characterPromises: ["保护你"],
    userPromises: ["每天给你写信"],
    recentEvents: ["第一次见面聊了很久"],
    relationshipHistory: ["关系变得亲密"],
    userPreferences: ["喜欢辣的食物"],
    characterPreferences: ["角色喜欢安静"],
    longTermSummary: "这是长期记忆摘要。",
  };

  it("renders a prompt with all sections populated", () => {
    const prompt = renderMemoryPrompt(fullContext);
    expect(prompt.length).toBeGreaterThan(200);
    expect(prompt).toContain("保护你");
    expect(prompt).toContain("第一次见面聊了很久");
    expect(prompt).toContain("角色对你的承诺");
    expect(prompt).toContain("你对角色的承诺");
  });

  it("omits empty sections", () => {
    const minimal: MemoryTemplateContext = {
      characterPromises: [],
      userPromises: [],
      recentEvents: [],
      relationshipHistory: [],
      userPreferences: [],
      characterPreferences: [],
      longTermSummary: "只有摘要。",
    };
    const prompt = renderMemoryPrompt(minimal);
    expect(prompt).not.toContain("近期重要事件");
    expect(prompt).not.toContain("关系发展历程");
    expect(prompt).not.toContain("角色对你的承诺");
    expect(prompt).not.toContain("你对角色的承诺");
    expect(prompt).not.toContain("你的偏好");
    expect(prompt).not.toContain("角色的偏好");
    expect(prompt).toContain("长期记忆摘要");
  });

  it("ends with continuity instruction", () => {
    const prompt = renderMemoryPrompt(fullContext);
    expect(prompt).toContain("情感连续性");
  });
});
