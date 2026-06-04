// Types & schemas
export {
  EventType,
  PromiseStatus,
  MemoryKind,
  type EpisodicMemory,
  type RelationshipMemory,
  type PromiseMemory,
  type PreferenceMemory,
  type Memory,
  type MemoryExtractionResult,
  type MemoryRetrievalParams,
  type MemoryRetrievalParamsInput,
  type MemoryRetrievalResult,
  type ScoredMemory,
  type MemorySummary,
  type MemoryStore,
  EpisodicMemory as EpisodicMemorySchema,
  RelationshipMemory as RelationshipMemorySchema,
  PromiseMemory as PromiseMemorySchema,
  PreferenceMemory as PreferenceMemorySchema,
  Memory as MemorySchema,
  MemoryExtractionResult as MemoryExtractionResultSchema,
  MemoryRetrievalParams as MemoryRetrievalParamsSchema,
  MemoryRetrievalResult as MemoryRetrievalResultSchema,
  MemorySummary as MemorySummarySchema,
} from "./types.js";

// PostgreSQL store — production Source of Truth
export { PostgresMemoryStore } from "./memory-store.postgres.js";

// Schema migrations
export { runMigrations } from "./schema.js";

// In-memory store — test doubles only, never for production
export { InMemoryStore } from "./memory-store.testdoubles.js";

// Extractor
export { extractMemory } from "./memory-extractor.js";

// Retriever
export { retrieveMemories } from "./memory-retriever.js";

// Summarizer
export { summarizeMemories } from "./memory-summarizer.js";

// Prompt integration
export {
  buildMemoryContext,
  renderMemoryPrompt,
  type MemoryTemplateContext,
} from "./memory.template.js";
