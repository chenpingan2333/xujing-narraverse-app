import type { Memory, MemoryStore, MemorySummary } from "./types.js";
import { retrieveMemories } from "./memory-retriever.js";

// ─── Summary generation ──────────────────────────────────────────────────────

export async function summarizeMemories(
  store: MemoryStore,
  userId: string,
  characterId?: string,
  options?: {
    maxInputMemories?: number;
    timeRange?: { start: number; end: number };
  },
): Promise<MemorySummary> {
  const maxInput = options?.maxInputMemories ?? 50;

  const result = await retrieveMemories(store, {
    userId,
    characterId,
    limit: maxInput,
    recencyBias: 0,
    importanceThreshold: 0.1,
  });

  const sourceIds: string[] = [];
  const snippets: string[] = [];

  for (const { memory } of result.memories) {
    sourceIds.push(memory.id);
    snippets.push(formatMemoryLine(memory));
  }

  const now = Date.now();
  const start = options?.timeRange?.start ?? now - 7 * 24 * 60 * 60 * 1000;
  const end = options?.timeRange?.end ?? now;

  const summary = buildSummary(snippets, userId, characterId);

  return {
    id: `sum_${userId}_${characterId ?? "all"}_${now.toString()}`,
    userId,
    characterId: characterId ?? null,
    summary,
    sourceMemoryIds: sourceIds,
    timeRange: { start, end },
    importance: Math.min(1, sourceIds.length / 50),
    createdAt: now,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMemoryLine(m: Memory): string {
  const ts = new Date(m.createdAt).toISOString().slice(0, 10);
  switch (m.kind) {
    case "episodic":
      return `[${ts}] 事件(${m.eventType}): ${truncate(m.content, 120)}`;
    case "relationship":
      return `[${ts}] 关系变化: 好感${fmtDelta(m.deltaAffection)} 信任${fmtDelta(m.deltaTrust)} 亲密${fmtDelta(m.deltaIntimacy)} — ${truncate(m.reason, 100)}`;
    case "promise":
      return `[${ts}] 承诺[${m.status}][${m.direction}]: ${truncate(m.content, 120)}`;
    case "preference":
      return `[${ts}] 偏好(${m.category}): ${truncate(m.content, 120)}`;
  }
}

function fmtDelta(n: number): string {
  return n >= 0 ? `+${n.toString()}` : n.toString();
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 3) + "...";
}

function buildSummary(
  lines: string[],
  userId: string,
  characterId?: string,
): string {
  if (lines.length === 0) {
    return characterId
      ? `用户 ${userId} 与角色 ${characterId} 暂无值得记录的过往记忆。`
      : `用户 ${userId} 暂无值得记录的过往记忆。`;
  }

  const header = characterId
    ? `用户 ${userId} 与角色 ${characterId} 的近期记忆摘要（共 ${lines.length.toString()} 条）：\n`
    : `用户 ${userId} 的近期记忆摘要（共 ${lines.length.toString()} 条）：\n`;

  return header + lines.map((l) => `- ${l}`).join("\n");
}
