/* eslint-disable @typescript-eslint/require-await */

import type {
  EpisodicMemory,
  MemoryStore,
  MemorySummary,
  PreferenceMemory,
  PromiseMemory,
  PromiseStatus,
  RelationshipMemory,
} from "./types.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function filterByCharacter<T extends { userId: string; characterId: string }>(
  items: T[],
  userId: string,
  characterId?: string,
): T[] {
  return items.filter(
    (m) => m.userId === userId && (!characterId || m.characterId === characterId),
  );
}

// ─── In-Memory Store ─────────────────────────────────────────────────────────

export class InMemoryStore implements MemoryStore {
  private episodic: EpisodicMemory[] = [];
  private relationship: RelationshipMemory[] = [];
  private promises: PromiseMemory[] = [];
  private preferences: PreferenceMemory[] = [];
  private summaries: MemorySummary[] = [];

  async addEpisodic(m: EpisodicMemory): Promise<void> {
    this.episodic.push(m);
  }

  async addRelationship(m: RelationshipMemory): Promise<void> {
    this.relationship.push(m);
  }

  async addPromise(m: PromiseMemory): Promise<void> {
    this.promises.push(m);
  }

  async addPreference(m: PreferenceMemory): Promise<void> {
    this.preferences.push(m);
  }

  async addSummary(s: MemorySummary): Promise<void> {
    this.summaries.push(s);
  }

  async getEpisodic(userId: string, characterId?: string): Promise<EpisodicMemory[]> {
    return filterByCharacter(this.episodic, userId, characterId);
  }

  async getRelationship(userId: string, characterId?: string): Promise<RelationshipMemory[]> {
    return filterByCharacter(this.relationship, userId, characterId);
  }

  async getPromises(userId: string, characterId?: string): Promise<PromiseMemory[]> {
    return filterByCharacter(this.promises, userId, characterId);
  }

  async getPreferences(userId: string, characterId?: string): Promise<PreferenceMemory[]> {
    return filterByCharacter(this.preferences, userId, characterId);
  }

  async getSummaries(userId: string, characterId?: string): Promise<MemorySummary[]> {
    return this.summaries.filter(
      (s) =>
        s.userId === userId &&
        (!characterId || s.characterId === null || s.characterId === characterId),
    );
  }

  async updatePromise(
    id: string,
    status: PromiseStatus,
    resolvedAt: number,
  ): Promise<void> {
    const p = this.promises.find((m) => m.id === id);
    if (p) {
      p.status = status;
      p.resolvedAt = resolvedAt;
    }
  }

  clear(): void {
    this.episodic = [];
    this.relationship = [];
    this.promises = [];
    this.preferences = [];
    this.summaries = [];
  }

  size(): number {
    return (
      this.episodic.length +
      this.relationship.length +
      this.promises.length +
      this.preferences.length +
      this.summaries.length
    );
  }
}
