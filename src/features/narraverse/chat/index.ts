// Types & interfaces
export {
  type CharacterData,
  type RelationshipData,
  type PromptBuildResult,
  type ModelSelection,
  type LLMResponse,
  type CharacterService,
  type RelationshipService,
  type PromptBuilder,
  type ModelRouter,
  type LLMClient,
  type ChatInput,
  type ChatResult,
  type ChatMessage,
  type SessionMessage,
  type RelationshipDelta,
  type MemoryEvent,
  type RuntimeContext,
  type ProblemDetail,
  type ChatRepository,
  type RelationshipEvent,
  type RelationshipEventType,
  ChatMessage as ChatMessageSchema,
  ChatResult as ChatResultSchema,
  ChatInput as ChatInputSchema,
  RuntimeContext as RuntimeContextSchema,
  ProblemDetail as ProblemDetailSchema,
  problem,
} from "./chat.types.js";

// Runtime engine
export { runChat } from "./chat.runtime.js";

// Pipeline
export { executeLoadContext, type LoadContextStep } from "./chat.pipeline.js";

// Service
export { ChatService } from "./chat.service.js";

// Repository
export { InMemoryChatRepository } from "./chat.repository.js";

// Message processing
export { processMessage, toChatMessage } from "./message-processor.js";

// Memory writeback
export { runMemoryWriteback } from "./memory-writeback.js";

// Relationship updater
export {
  detectRelationshipEvents,
  computeRelationshipDelta,
} from "./relationship-updater.js";

// Runtime context
export { buildRuntimeContext } from "./runtime-context.js";
