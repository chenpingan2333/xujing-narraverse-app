import type { CharacterService, RelationshipService, ChatRepository, RuntimeContext } from "./chat.types.js";
import type { MemoryStore } from "../memory/index.js";
import { buildRuntimeContext } from "./runtime-context.js";

/**
 * Pipeline step: load character, relationship, and memory context.
 */
export interface LoadContextStep {
  characterService: CharacterService;
  relationshipService: RelationshipService;
  memoryStore: MemoryStore;
  chatRepository: ChatRepository;
  userId: string;
  characterId: string;
  sessionId: string;
}

export async function executeLoadContext(
  step: LoadContextStep,
): Promise<RuntimeContext> {
  return buildRuntimeContext({
    characterService: step.characterService,
    relationshipService: step.relationshipService,
    memoryStore: step.memoryStore,
    chatRepository: step.chatRepository,
    userId: step.userId,
    characterId: step.characterId,
    sessionId: step.sessionId,
  });
}
