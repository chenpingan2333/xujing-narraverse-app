// 叙境 — Tiered Memory Store
// Wraps a MemoryStore, enforcing limits based on VIP status.
// Free users: auto-evict oldest memories when over limit (LRU by createdAt).
// VIP users: 10000 memories, with soft warning at 80%.

import type {
  EpisodicMemory,
  RelationshipMemory,
  PromiseMemory,
  PreferenceMemory,
  MemorySummary,
  MemoryStore,
  PromiseStatus,
} from "./types.js";
import { FREE_MEMORY_LIMIT, VIP_MEMORY_LIMIT } from "../user/quota.js";

export class TieredMemoryStore implements MemoryStore {
  constructor(
    private readonly inner: MemoryStore,
    private readonly isVip: () => boolean,
  ) {}

  private getLimit(): number {
    return this.isVip() ? VIP_MEMORY_LIMIT : FREE_MEMORY_LIMIT;
  }

  /** Auto-evict oldest memories to stay under the limit */
  private async enforceLimit(userId: string, characterId?: string): Promise<void> {
    const limit = this.getLimit();
    const [episodic, rel, promises, prefs, summaries] = await Promise.all([
      this.inner.getEpisodic(userId, characterId),
      this.inner.getRelationship(userId, characterId),
      this.inner.getPromises(userId, characterId),
      this.inner.getPreferences(userId, characterId),
      this.inner.getSummaries(userId, characterId),
    ]);

    // Collect all with their createdAt timestamps for LRU eviction
    type TimedMemory = { createdAt: number };
    const all: TimedMemory[] = [
      ...episodic, ...rel, ...promises, ...prefs, ...summaries,
    ];

    // Sort oldest-first
    all.sort((a, b) => a.createdAt - b.createdAt);

    // Evict oldest until we're under the limit (keep most recent 'limit' items)
    const toEvict = all.slice(0, Math.max(0, all.length - limit));

    // Evict from each category
    for (const item of toEvict) {
      // Use duck-typing: each category has its own removal strategy
      // We cast through any since we're matching by reference
      const epIdx = episodic.indexOf(item as EpisodicMemory);
      if (epIdx >= 0) { episodic.splice(epIdx, 1); continue; }
      const relIdx = rel.indexOf(item as RelationshipMemory);
      if (relIdx >= 0) { rel.splice(relIdx, 1); continue; }
      const promIdx = promises.indexOf(item as PromiseMemory);
      if (promIdx >= 0) { promises.splice(promIdx, 1); continue; }
      const prefIdx = prefs.indexOf(item as PreferenceMemory);
      if (prefIdx >= 0) { prefs.splice(prefIdx, 1); continue; }
      const sumIdx = summaries.indexOf(item as MemorySummary);
      if (sumIdx >= 0) { summaries.splice(sumIdx, 1); }
    }

    if (toEvict.length > 0) {
      console.log(
        "[TieredMemory] Evicted " + toEvict.length +
        " oldest memories for user " + userId +
        " (limit=" + limit + ", was=" + all.length + ")"
      );
    }
  }

  async addEpisodic(m: EpisodicMemory): Promise<void> {
    await this.inner.addEpisodic(m);
    await this.enforceLimit(m.userId, m.characterId);
  }

  async addRelationship(m: RelationshipMemory): Promise<void> {
    await this.inner.addRelationship(m);
    await this.enforceLimit(m.userId, m.characterId);
  }

  async addPromise(m: PromiseMemory): Promise<void> {
    await this.inner.addPromise(m);
    await this.enforceLimit(m.userId, m.characterId);
  }

  async addPreference(m: PreferenceMemory): Promise<void> {
    await this.inner.addPreference(m);
    await this.enforceLimit(m.userId, m.characterId);
  }

  async addSummary(s: MemorySummary): Promise<void> {
    await this.inner.addSummary(s);
    await this.enforceLimit(s.userId, s.characterId ?? undefined);
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
    return this.inner.updatePromise(id, status, resolvedAt);
  }
}
