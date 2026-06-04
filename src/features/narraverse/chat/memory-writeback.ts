import { randomUUID } from "node:crypto";
import type { MemoryStore } from "../memory/index.js";
import { extractMemory } from "../memory/index.js";
import type {
  EpisodicMemory,
  RelationshipMemory,
  PromiseMemory,
  PreferenceMemory,
} from "../memory/index.js";
import { summarizeMemories } from "../memory/index.js";
import type { MemoryEvent, RelationshipDelta } from "./chat.types.js";

interface WritebackInput {
  userId: string;
  characterId: string;
  messages: Array<{ role: "user" | "character"; content: string; timestamp: number }>;
  relationshipDelta: RelationshipDelta;
}

interface WritebackResult {
  episodicCount: number;
  relationshipCount: number;
  promiseCount: number;
  preferenceCount: number;
  summaryGenerated: boolean;
  events: MemoryEvent[];
}

/**
 * After each chat turn, extract memories from the conversation
 * and persist them to the MemoryStore.
 */
export async function runMemoryWriteback(
  store: MemoryStore,
  input: WritebackInput,
): Promise<WritebackResult> {
  const now = Date.now();
  const { userId, characterId, messages, relationshipDelta } = input;

  // Augment messages with userId/characterId as required by extractMemory
  const augmented = messages.map((m) => ({
    userId,
    characterId,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
  }));

  const extracted = extractMemory(augmented, userId, characterId);

  let episodicCount = 0;
  for (const m of extracted.episodic) {
    const rec: EpisodicMemory = { id: randomUUID(), ...m, createdAt: now };
    await store.addEpisodic(rec);
    episodicCount++;
  }

  let relationshipCount = 0;
  for (const m of extracted.relationship) {
    const rec: RelationshipMemory = { id: randomUUID(), ...m, createdAt: now };
    await store.addRelationship(rec);
    relationshipCount++;
  }

  if (relationshipDelta.affection !== 0 || relationshipDelta.trust !== 0 || relationshipDelta.intimacy !== 0) {
    const deltaRec: RelationshipMemory = {
      id: randomUUID(),
      userId,
      characterId,
      deltaAffection: relationshipDelta.affection,
      deltaTrust: relationshipDelta.trust,
      deltaIntimacy: relationshipDelta.intimacy,
      reason: relationshipDelta.reason,
      importance: 0.6,
      createdAt: now,
    };
    await store.addRelationship(deltaRec);
    relationshipCount++;
  }

  let promiseCount = 0;
  for (const m of extracted.promises) {
    const rec: PromiseMemory = {
      id: randomUUID(),
      ...m,
      createdAt: now,
      resolvedAt: null,
    };
    await store.addPromise(rec);
    promiseCount++;
  }

  let preferenceCount = 0;
  for (const m of extracted.preferences) {
    const rec: PreferenceMemory = { id: randomUUID(), ...m, createdAt: now };
    await store.addPreference(rec);
    preferenceCount++;
  }

  const totalEpisodic = await store.getEpisodic(userId, characterId);
  let summaryGenerated = false;
  if (totalEpisodic.length > 0 && totalEpisodic.length % 10 === 0) {
    const summary = await summarizeMemories(store, userId, characterId);
    await store.addSummary(summary);
    summaryGenerated = true;
  }

  const events: MemoryEvent[] = [];
  for (const m of extracted.episodic) {
    events.push({ type: "episodic", content: m.content, importance: m.importance });
  }
  for (const m of extracted.relationship) {
    events.push({ type: "relationship", content: m.reason, importance: m.importance });
  }
  for (const m of extracted.promises) {
    events.push({ type: "promise", content: m.content, importance: m.importance });
  }
  for (const m of extracted.preferences) {
    events.push({ type: "preference", content: m.content, importance: m.importance });
  }

  return {
    episodicCount,
    relationshipCount,
    promiseCount,
    preferenceCount,
    summaryGenerated,
    events,
  };
}
