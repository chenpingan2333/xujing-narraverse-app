import { z } from "zod";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const EventType = z.enum([
  "conversation",
  "conflict",
  "revelation",
  "decision",
  "milestone",
  "emotional_shift",
  "promise_made",
  "promise_broken",
  "promise_fulfilled",
  "preference_expressed",
  "relationship_change",
  "other",
]);
export type EventType = z.infer<typeof EventType>;

export const PromiseStatus = z.enum(["active", "fulfilled", "broken"]);
export type PromiseStatus = z.infer<typeof PromiseStatus>;

export const MemoryKind = z.enum([
  "episodic",
  "relationship",
  "promise",
  "preference",
]);
export type MemoryKind = z.infer<typeof MemoryKind>;

// ─── Core Memory Types ───────────────────────────────────────────────────────

export const EpisodicMemory = z.object({
  id: z.string(),
  userId: z.string(),
  characterId: z.string(),
  eventType: EventType,
  content: z.string(),
  importance: z.number().min(0).max(1),
  createdAt: z.number(),
});
export type EpisodicMemory = z.infer<typeof EpisodicMemory>;

export const RelationshipMemory = z.object({
  id: z.string(),
  userId: z.string(),
  characterId: z.string(),
  deltaAffection: z.number(),
  deltaTrust: z.number(),
  deltaIntimacy: z.number(),
  reason: z.string(),
  importance: z.number().min(0).max(1),
  createdAt: z.number(),
});
export type RelationshipMemory = z.infer<typeof RelationshipMemory>;

export const PromiseMemory = z.object({
  id: z.string(),
  userId: z.string(),
  characterId: z.string(),
  direction: z.enum(["character_to_user", "user_to_character"]),
  content: z.string(),
  status: PromiseStatus,
  importance: z.number().min(0).max(1),
  createdAt: z.number(),
  resolvedAt: z.number().nullable(),
});
export type PromiseMemory = z.infer<typeof PromiseMemory>;

export const PreferenceMemory = z.object({
  id: z.string(),
  userId: z.string(),
  characterId: z.string(),
  category: z.string(),
  content: z.string(),
  importance: z.number().min(0).max(1),
  createdAt: z.number(),
});
export type PreferenceMemory = z.infer<typeof PreferenceMemory>;

// ─── Union (discriminated on "kind") ─────────────────────────────────────────

export const Memory = z.discriminatedUnion("kind", [
  EpisodicMemory.extend({ kind: z.literal("episodic") }),
  RelationshipMemory.extend({ kind: z.literal("relationship") }),
  PromiseMemory.extend({ kind: z.literal("promise") }),
  PreferenceMemory.extend({ kind: z.literal("preference") }),
]);
export type Memory = z.infer<typeof Memory>;

// ─── Extraction ──────────────────────────────────────────────────────────────

export const MemoryExtractionResult = z.object({
  episodic: z.array(EpisodicMemory.omit({ id: true, createdAt: true })),
  relationship: z.array(
    RelationshipMemory.omit({ id: true, createdAt: true })
  ),
  promises: z.array(PromiseMemory.omit({ id: true, createdAt: true, resolvedAt: true })),
  preferences: z.array(
    PreferenceMemory.omit({ id: true, createdAt: true })
  ),
});
export type MemoryExtractionResult = z.infer<typeof MemoryExtractionResult>;

// ─── Retrieval ───────────────────────────────────────────────────────────────

export const MemoryRetrievalParams = z.object({
  userId: z.string(),
  characterId: z.string().optional(),
  query: z.string().optional(),
  kinds: z.array(MemoryKind).optional(),
  limit: z.number().min(1).max(100).default(20),
  recencyBias: z.number().min(0).max(1).default(0.3),
  importanceThreshold: z.number().min(0).max(1).default(0),
});
export type MemoryRetrievalParams = z.infer<typeof MemoryRetrievalParams>;
export type MemoryRetrievalParamsInput = z.input<typeof MemoryRetrievalParams>;

export const ScoredMemory = z.object({
  memory: Memory,
  score: z.number(),
});
export type ScoredMemory = z.infer<typeof ScoredMemory>;

export const MemoryRetrievalResult = z.object({
  memories: z.array(ScoredMemory),
  totalCandidates: z.number(),
  params: MemoryRetrievalParams,
});
export type MemoryRetrievalResult = z.infer<typeof MemoryRetrievalResult>;

// ─── Summary ─────────────────────────────────────────────────────────────────

export const MemorySummary = z.object({
  id: z.string(),
  userId: z.string(),
  characterId: z.string().nullable(),
  summary: z.string(),
  sourceMemoryIds: z.array(z.string()),
  timeRange: z.object({
    start: z.number(),
    end: z.number(),
  }),
  importance: z.number().min(0).max(1),
  createdAt: z.number(),
});
export type MemorySummary = z.infer<typeof MemorySummary>;

// ─── Store Interface ─────────────────────────────────────────────────────────

export interface MemoryStore {
  addEpisodic(m: EpisodicMemory): Promise<void>;
  addRelationship(m: RelationshipMemory): Promise<void>;
  addPromise(m: PromiseMemory): Promise<void>;
  addPreference(m: PreferenceMemory): Promise<void>;
  addSummary(s: MemorySummary): Promise<void>;
  getEpisodic(userId: string, characterId?: string): Promise<EpisodicMemory[]>;
  getRelationship(userId: string, characterId?: string): Promise<RelationshipMemory[]>;
  getPromises(userId: string, characterId?: string): Promise<PromiseMemory[]>;
  getPreferences(userId: string, characterId?: string): Promise<PreferenceMemory[]>;
  getSummaries(userId: string, characterId?: string): Promise<MemorySummary[]>;
  updatePromise(id: string, status: PromiseStatus, resolvedAt: number): Promise<void>;
}
