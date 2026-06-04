import type {
  Memory,
  MemoryRetrievalParamsInput,
  MemoryRetrievalResult,
  MemoryStore,
  ScoredMemory,
} from "./types.js";
import { MemoryRetrievalParams as MemoryRetrievalParamsSchema } from "./types.js";

// ─── Cosine-like keyword overlap ────────────────────────────────────────────

function keywordRelevance(memoryContent: string, query: string): number {
  if (!query) return 0;
  const queryChars = new Set(query.replace(/\s+/g, ""));
  if (queryChars.size === 0) return 0;

  const memChars = memoryContent.replace(/\s+/g, "");
  let hits = 0;
  for (const ch of queryChars) {
    if (memChars.includes(ch)) hits++;
  }
  return hits / queryChars.size;
}

// ─── Time decay ──────────────────────────────────────────────────────────────

function timeDecay(
  createdAt: number,
  now: number,
  recencyBias: number,
): number {
  if (recencyBias === 0) return 1;
  const ageHours = (now - createdAt) / (1000 * 60 * 60);
  const halfLifeHours = 24 * 7;
  return Math.exp((-recencyBias * ageHours) / halfLifeHours);
}

// ─── Main ────────────────────────────────────────────────────────────────────

export async function retrieveMemories(
  store: MemoryStore,
  input: MemoryRetrievalParamsInput,
): Promise<MemoryRetrievalResult> {
  const params = MemoryRetrievalParamsSchema.parse(input);
  const {
    userId,
    characterId,
    query,
    kinds,
    limit,
    recencyBias,
    importanceThreshold,
  } = params;

  const allMemories: Memory[] = [];

  const want = (k: string) => !kinds || kinds.includes(k as never);

  if (want("episodic")) {
    const episodics = await store.getEpisodic(userId, characterId);
    allMemories.push(
      ...episodics.map(
        (m) => ({ ...m, kind: "episodic" as const }),
      ),
    );
  }

  if (want("relationship")) {
    const rels = await store.getRelationship(userId, characterId);
    allMemories.push(
      ...rels.map(
        (m) => ({ ...m, kind: "relationship" as const }),
      ),
    );
  }

  if (want("promise")) {
    const proms = await store.getPromises(userId, characterId);
    allMemories.push(
      ...proms.map(
        (m) => ({ ...m, kind: "promise" as const }),
      ),
    );
  }

  if (want("preference")) {
    const prefs = await store.getPreferences(userId, characterId);
    allMemories.push(
      ...prefs.map(
        (m) => ({ ...m, kind: "preference" as const }),
      ),
    );
  }

  const now = Date.now();

  const scored: ScoredMemory[] = allMemories
    .filter((m) => m.importance >= importanceThreshold)
    .map((memory) => {
      const relevance = query
        ? keywordRelevance(getMemoryContent(memory), query)
        : 0.5;
      const decay = timeDecay(memory.createdAt, now, recencyBias);
      const score =
        relevance * 0.4 + memory.importance * 0.3 + decay * 0.3;
      return { memory, score };
    });

  scored.sort((a, b) => b.score - a.score);

  return {
    memories: scored.slice(0, limit),
    totalCandidates: scored.length,
    params,
  };
}

function getMemoryContent(m: Memory): string {
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
