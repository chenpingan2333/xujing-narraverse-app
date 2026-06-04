import type {
  CharacterService,
  RelationshipService,
  RuntimeContext,
  ChatRepository,
} from "./chat.types.js";
import { buildMemoryContext, renderMemoryPrompt } from "../memory/index.js";
import type { MemoryStore } from "../memory/index.js";

export async function buildRuntimeContext(params: {
  characterService: CharacterService;
  relationshipService: RelationshipService;
  memoryStore: MemoryStore;
  chatRepository: ChatRepository;
  userId: string;
  characterId: string;
  sessionId: string;
}): Promise<RuntimeContext> {
  const { characterService, relationshipService, memoryStore, chatRepository } =
    params;
  const { userId, characterId, sessionId } = params;

  const [character, relationship, sessionMessages] = await Promise.all([
    characterService.getCharacter(userId, characterId),
    relationshipService.getRelationship(userId, characterId),
    chatRepository.getSessionMessages(sessionId),
  ]);

  const memCtx = await buildMemoryContext(memoryStore, userId, characterId);
  const memoryContext = renderMemoryPrompt(memCtx);

  return {
    character: {
      id: character.id,
      name: character.name,
      persona: character.persona,
      description: character.description,
      avatarUrl: character.avatarUrl,
    },
    relationship: {
      affection: relationship.affection,
      trust: relationship.trust,
      intimacy: relationship.intimacy,
      status: relationship.status,
    },
    memoryContext,
    sessionId,
    sessionMessages,
  };
}
