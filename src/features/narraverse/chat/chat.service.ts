import type {
  CharacterService,
  RelationshipService,
  PromptBuilder,
  ChatRepository,
  ChatInput,
  ChatResult,
} from "./chat.types.js";
import type { MemoryStore } from "../memory/index.js";
import type { ProviderGateway } from "../provider/index.js";
import { runChat } from "./chat.runtime.js";

/**
 * ChatService wraps runChat with dependency injection.
 * All LLM calls are routed through ProviderGateway.
 */
export class ChatService {
  constructor(
    private readonly characterService: CharacterService,
    private readonly relationshipService: RelationshipService,
    private readonly promptBuilder: PromptBuilder,
    private readonly providerGateway: ProviderGateway,
    private readonly memoryStore: MemoryStore,
    private readonly chatRepository: ChatRepository,
  ) {}

  async send(input: ChatInput): Promise<ChatResult> {
    return runChat(
      {
        characterService: this.characterService,
        relationshipService: this.relationshipService,
        promptBuilder: this.promptBuilder,
        providerGateway: this.providerGateway,
        memoryStore: this.memoryStore,
        chatRepository: this.chatRepository,
      },
      input,
    );
  }
}
