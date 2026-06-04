import type { Memory, MemoryStore } from "./types.js";
import { retrieveMemories } from "./memory-retriever.js";
import { summarizeMemories } from "./memory-summarizer.js";

// ─── Template context builder ────────────────────────────────────────────────

export interface MemoryTemplateContext {
  characterPromises: string[];
  userPromises: string[];
  recentEvents: string[];
  relationshipHistory: string[];
  userPreferences: string[];
  characterPreferences: string[];
  longTermSummary: string;
}

// ─── Context builder ─────────────────────────────────────────────────────────

export async function buildMemoryContext(
  store: MemoryStore,
  userId: string,
  characterId: string,
): Promise<MemoryTemplateContext> {
  const allPromises = await store.getPromises(userId, characterId);
  const activePromises = allPromises.filter((p) => p.status === "active");

  const characterPromises = activePromises
    .filter((p) => p.direction === "character_to_user")
    .map((p) => p.content);

  const userPromises = activePromises
    .filter((p) => p.direction === "user_to_character")
    .map((p) => p.content);

  const episodicResult = await retrieveMemories(store, {
    userId,
    characterId,
    kinds: ["episodic"],
    limit: 10,
    recencyBias: 0.5,
    importanceThreshold: 0.2,
  });
  const recentEvents = episodicResult.memories.map((sm) => getContent(sm.memory));

  const relResult = await retrieveMemories(store, {
    userId,
    characterId,
    kinds: ["relationship"],
    limit: 10,
    recencyBias: 0.3,
    importanceThreshold: 0,
  });
  const relationshipHistory = relResult.memories.map(
    (sm) => getContent(sm.memory),
  );

  const prefs = await store.getPreferences(userId, characterId);
  const userPreferences = prefs
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5)
    .map((p) => p.content);

  const characterPreferences = prefs
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5)
    .map((p) => p.content);

  const summary = await summarizeMemories(store, userId, characterId, {
    maxInputMemories: 100,
  });
  const longTermSummary = summary.summary;

  return {
    characterPromises,
    userPromises,
    recentEvents,
    relationshipHistory,
    userPreferences,
    characterPreferences,
    longTermSummary,
  };
}

// ─── Prompt template ─────────────────────────────────────────────────────────

export function renderMemoryPrompt(ctx: MemoryTemplateContext): string {
  const sections: string[] = [];

  sections.push("【叙事记忆 —— 你们共同经历的故事】");

  if (ctx.longTermSummary) {
    sections.push(`\n📖 长期记忆摘要：\n${ctx.longTermSummary}`);
  }

  if (ctx.recentEvents.length > 0) {
    sections.push(
      `\n📅 近期重要事件：\n${ctx.recentEvents.map((e) => `  • ${e}`).join("\n")}`,
    );
  }

  if (ctx.relationshipHistory.length > 0) {
    sections.push(
      `\n💞 关系发展历程：\n${ctx.relationshipHistory.map((r) => `  • ${r}`).join("\n")}`,
    );
  }

  if (ctx.characterPromises.length > 0) {
    sections.push(
      `\n🤝 角色对你的承诺：\n${ctx.characterPromises.map((p) => `  • ${p}`).join("\n")}`,
    );
  }

  if (ctx.userPromises.length > 0) {
    sections.push(
      `\n🙋 你对角色的承诺：\n${ctx.userPromises.map((p) => `  • ${p}`).join("\n")}`,
    );
  }

  if (ctx.userPreferences.length > 0) {
    sections.push(
      `\n⭐ 你的偏好：\n${ctx.userPreferences.map((p) => `  • ${p}`).join("\n")}`,
    );
  }

  if (ctx.characterPreferences.length > 0) {
    sections.push(
      `\n🎭 角色的偏好：\n${ctx.characterPreferences.map((p) => `  • ${p}`).join("\n")}`,
    );
  }

  sections.push(
    "\n---\n请在对话中自然地融入这些记忆，让角色展现出对过往经历的认知和情感连续性。",
  );

  return sections.join("\n");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getContent(m: Memory): string {
  switch (m.kind) {
    case "episodic":
      return m.content;
    case "relationship":
      return m.reason;
    case "promise":
      return m.content;
    case "preference":
      return m.content;
  }
}
