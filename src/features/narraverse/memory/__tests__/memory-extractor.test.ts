import { describe, it, expect } from "vitest";
import { extractMemory } from "../memory-extractor.js";

describe("extractMemory", () => {
  const userId = "u1";
  const characterId = "c1";

  it("extracts promise when user says 我答应", () => {
    const messages = [
      {
        userId,
        characterId,
        role: "user" as const,
        content: "我答应你，下次一定会带你去旅行。",
        timestamp: Date.now(),
      },
    ];
    const result = extractMemory(messages, userId, characterId);
    expect(result.promises.length).toBeGreaterThan(0);
    expect(result.promises[0].direction).toBe("user_to_character");
    expect(result.promises[0].status).toBe("active");
  });

  it("extracts character promise when character says 我保证", () => {
    const messages = [
      {
        userId,
        characterId,
        role: "character" as const,
        content: "我保证永远不会离开你。",
        timestamp: Date.now(),
      },
    ];
    const result = extractMemory(messages, userId, characterId);
    expect(result.promises.length).toBeGreaterThan(0);
    expect(result.promises[0].direction).toBe("character_to_user");
  });

  it("extracts preferences with category inference", () => {
    const messages = [
      {
        userId,
        characterId,
        role: "user" as const,
        content: "我从小就特别喜欢听音乐。",
        timestamp: Date.now(),
      },
    ];
    const result = extractMemory(messages, userId, characterId);
    expect(result.preferences.length).toBeGreaterThan(0);
    expect(result.preferences[0].category).toBe("music");
  });

  it("detects emotional shifts", () => {
    const messages = [
      {
        userId,
        characterId,
        role: "character" as const,
        content: "我今天特别开心，感动得差点哭了。",
        timestamp: Date.now(),
      },
    ];
    const result = extractMemory(messages, userId, characterId);
    const emotionalEvents = result.episodic.filter(
      (e) => e.eventType === "emotional_shift",
    );
    expect(emotionalEvents.length).toBeGreaterThan(0);
  });

  it("extracts relationship deltas from sentiment", () => {
    const messages = [
      {
        userId,
        characterId,
        role: "character" as const,
        content: "你真好，和你在一起特别幸福开心。谢谢你一直的陪伴，我会珍惜的。",
        timestamp: Date.now(),
      },
    ];
    const result = extractMemory(messages, userId, characterId);
    expect(result.relationship.length).toBeGreaterThan(0);
    expect(result.relationship[0].deltaAffection).toBeGreaterThan(0);
  });

  it("produces negative relationship deltas for negative messages", () => {
    const messages = [
      {
        userId,
        characterId,
        role: "character" as const,
        content: "我很难过，特别伤心。你给我带来了痛苦和愤怒。",
        timestamp: Date.now(),
      },
    ];
    const result = extractMemory(messages, userId, characterId);
    expect(result.relationship.length).toBeGreaterThan(0);
    expect(result.relationship[0].deltaAffection).toBeLessThan(0);
  });

  it("handles empty messages gracefully", () => {
    const result = extractMemory([], userId, characterId);
    expect(result.episodic).toEqual([]);
    expect(result.relationship).toEqual([]);
    expect(result.promises).toEqual([]);
    expect(result.preferences).toEqual([]);
  });

  it("captures conversational messages as episodic events", () => {
    const messages = [
      {
        userId,
        characterId,
        role: "user" as const,
        content: "你好，今天的天气真不错，适合出去走走，顺便还可以去公园散散步聊聊天。",
        timestamp: Date.now(),
      },
    ];
    const result = extractMemory(messages, userId, characterId);
    const conversations = result.episodic.filter(
      (e) => e.eventType === "conversation",
    );
    expect(conversations.length).toBeGreaterThan(0);
  });

  it("assigns higher importance to promise-related memories", () => {
    const promiseMessages = [
      {
        userId,
        characterId,
        role: "character" as const,
        content: "我发誓一定会保护你直到永远。",
        timestamp: Date.now(),
      },
    ];
    const normalMessages = [
      {
        userId,
        characterId,
        role: "user" as const,
        content: "今天吃了吗？",
        timestamp: Date.now(),
      },
    ];

    const promiseResult = extractMemory(promiseMessages, userId, characterId);
    const normalResult = extractMemory(normalMessages, userId, characterId);

    const promiseImportance = promiseResult.promises[0]?.importance ?? 0;
    const normalImportance = normalResult.episodic[0]?.importance ?? 0;
    expect(promiseImportance).toBeGreaterThan(normalImportance);
  });

  it("infers food category for food-related preferences", () => {
    const messages = [
      {
        userId,
        characterId,
        role: "user" as const,
        content: "我一直很喜欢吃辣的食物。",
        timestamp: Date.now(),
      },
    ];
    const result = extractMemory(messages, userId, characterId);
    expect(result.preferences[0].category).toBe("food");
  });

  it("infers books category for reading-related preferences", () => {
    const messages = [
      {
        userId,
        characterId,
        role: "user" as const,
        content: "我喜欢看小说，特别是文学作品。",
        timestamp: Date.now(),
      },
    ];
    const result = extractMemory(messages, userId, characterId);
    expect(result.preferences[0].category).toBe("books");
  });

  it("does not duplicate episodic entries for emotional messages", () => {
    const messages = [
      {
        userId,
        characterId,
        role: "character" as const,
        content: "我今天好开心呀。",
        timestamp: Date.now(),
      },
    ];
    const result = extractMemory(messages, userId, characterId);
    expect(result.episodic.length).toBe(1);
    expect(result.episodic[0].eventType).toBe("emotional_shift");
  });

  it("skips very short messages for episodic memory", () => {
    const messages = [
      {
        userId,
        characterId,
        role: "user" as const,
        content: "嗯",
        timestamp: Date.now(),
      },
    ];
    const result = extractMemory(messages, userId, characterId);
    expect(result.episodic).toEqual([]);
  });
});
