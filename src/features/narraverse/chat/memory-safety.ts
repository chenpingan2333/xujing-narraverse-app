import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import type {
  MemoryStore, EpisodicMemory, RelationshipMemory,
  PromiseMemory, PreferenceMemory, MemorySummary,
  PromiseStatus,
} from "../memory/types.js";

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= maxRetries; i++) {
    try { return await fn(); } catch (e) {
      lastErr = e;
      if (i < maxRetries) await new Promise((r) => setTimeout(r, 100 * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

function contentHash(memory: EpisodicMemory | RelationshipMemory | PromiseMemory | PreferenceMemory): string {
  const contentStr = "content" in memory ? memory.content
    : "reason" in memory ? memory.reason
    : JSON.stringify(memory);
  return createHash("sha256").update(contentStr + "|" + memory.userId + "|" + memory.characterId).digest("hex").slice(0, 16);
}

export class MemorySafetyStore implements MemoryStore {
  private hashes = new Set<string>();
  private readonly maxSize: number;

  constructor(
    private readonly inner: MemoryStore,
    options: { maxEpisodicSize?: number } = {},
  ) {
    this.maxSize = options.maxEpisodicSize ?? 5000;
  }

  private async tryWrite<T>(fn: () => Promise<T>): Promise<T> {
    return withRetry(fn, 3);
  }

  async addEpisodic(m: EpisodicMemory): Promise<void> {
    const hash = contentHash(m);
    if (this.hashes.has(hash)) return;
    await this.tryWrite(async () => {
      await this.inner.addEpisodic(m);
      this.hashes.add(hash);
      await this.enforceCap();
    });
  }

  async addRelationship(m: RelationshipMemory): Promise<void> {
    const hash = contentHash(m);
    if (this.hashes.has(hash)) return;
    await this.tryWrite(async () => {
      await this.inner.addRelationship(m);
      this.hashes.add(hash);
    });
  }

  async addPromise(m: PromiseMemory): Promise<void> {
    const hash = contentHash(m);
    if (this.hashes.has(hash)) return;
    await this.tryWrite(async () => {
      await this.inner.addPromise(m);
      this.hashes.add(hash);
    });
  }

  async addPreference(m: PreferenceMemory): Promise<void> {
    const hash = contentHash(m);
    if (this.hashes.has(hash)) return;
    await this.tryWrite(async () => {
      await this.inner.addPreference(m);
      this.hashes.add(hash);
    });
  }

  async addSummary(s: MemorySummary): Promise<void> {
    await this.tryWrite(() => this.inner.addSummary(s));
  }

  async getEpisodic(userId: string, characterId?: string): Promise<EpisodicMemory[]> {
    return this.inner.getEpisodic(userId, characterId);
  }

  async getRelationship(userId: string, characterId?: string): Promise<RelationshipMemory[]> {
    return this.inner.getRelationship(userId, characterId);
  }

  async getPromises(userId: string, characterId?: string): Promise<PromiseMemory[]> {
    return this.inner.getPromises(userId, characterId);
  }

  async getPreferences(userId: string, characterId?: string): Promise<PreferenceMemory[]> {
    return this.inner.getPreferences(userId, characterId);
  }

  async getSummaries(userId: string, characterId?: string): Promise<MemorySummary[]> {
    return this.inner.getSummaries(userId, characterId);
  }

  async updatePromise(id: string, status: PromiseStatus, resolvedAt: number): Promise<void> {
    await this.inner.updatePromise(id, status, resolvedAt);
  }

  private async enforceCap(): Promise<void> {
    const episodic = await this.inner.getEpisodic("__global__", undefined).catch(() => [] as EpisodicMemory[]);
    void episodic;
  }

  clearHashes(): void { this.hashes.clear(); }
  getHashCount(): number { return this.hashes.size; }
}

export function ruleBasedSummary(
  episodic: EpisodicMemory[],
  userId: string,
  characterId: string,
): MemorySummary {
  const now = Date.now();
  const events = episodic.slice(-10);

  const lines: string[] = [];
  if (events.length === 0) {
    lines.push("尚未有记忆片段。");
  } else {
    lines.push("最近 " + String(events.length) + " 条记忆：");
    for (const e of events) {
      const ts = new Date(e.createdAt).toLocaleDateString("zh-CN");
      lines.push("- [" + ts + "] " + e.content + " (重要性: " + String(Math.round(e.importance * 10)) + "/10)");
    }
  }

  const timestamps = events.length > 0
    ? events.map((e) => e.createdAt)
    : [now - 86400000, now];

  return {
    id: "rule-summary-" + randomUUID().slice(0, 8),
    userId,
    characterId,
    summary: lines.join("\n"),
    sourceMemoryIds: events.map((e) => e.id),
    timeRange: { start: Math.min(...timestamps), end: Math.max(...timestamps) },
    importance: events.length > 0
      ? events.reduce((s, e) => s + e.importance, 0) / events.length
      : 0.3,
    createdAt: now,
  };
}

export async function safeSummarize(
  store: MemoryStore,
  userId: string,
  characterId: string,
  llmSummarize?: (episodic: EpisodicMemory[]) => Promise<MemorySummary>,
): Promise<MemorySummary> {
  const episodic = await store.getEpisodic(userId, characterId);
  if (episodic.length === 0) {
    return ruleBasedSummary(episodic, userId, characterId);
  }
  if (llmSummarize) {
    try { return await llmSummarize(episodic); } catch { /* fallback */ }
  }
  return ruleBasedSummary(episodic, userId, characterId);
}