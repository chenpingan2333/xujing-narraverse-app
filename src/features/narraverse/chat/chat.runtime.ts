import { randomUUID } from "node:crypto";
import type {
  CharacterService,
  RelationshipService,
  PromptBuilder,
  ChatRepository,
  ChatInput,
  ChatResult,
  SessionMessage,
} from "./chat.types.js";
import type { ProviderGateway } from "../provider/index.js";
import type { MemoryStore } from "../memory/index.js";
import { buildRuntimeContext } from "./runtime-context.js";
import { detectRelationshipEvents, computeRelationshipDelta } from "./relationship-updater.js";
import { runMemoryWriteback } from "./memory-writeback.js";

interface PipelineDeps {
  characterService: CharacterService;
  relationshipService: RelationshipService;
  promptBuilder: PromptBuilder;
  providerGateway: ProviderGateway;
  memoryStore: MemoryStore;
  chatRepository: ChatRepository;
}

/**
 * runChat — the main entry point for the Chat Runtime.
 *
 * Pipeline:
 *   1. Load Character + Relationship
 *   2. Retrieve relevant Memory → build memory context prompt
 *   3. Build Prompt via Prompt Builder
 *   4. Call LLM via ProviderGateway (unified routing + provider selection)
 *   5. Memory Writeback: extract + save memories
 *   6. Relationship Update: detect events → compute delta → persist
 *   7. Save session messages
 *   8. Return ChatResult
 *
 * All LLM calls go through ProviderGateway.chat().
 * Direct provider/SDK calls are forbidden.
 */
export async function runChat(
  deps: PipelineDeps,
  input: ChatInput,
): Promise<ChatResult> {
  const {
    characterService,
    relationshipService,
    promptBuilder,
    providerGateway,
    memoryStore,
    chatRepository,
  } = deps;
  const { userId, characterId, message, sessionId, isVip, characterTier, worldTier } = input;

  const character = await characterService.getCharacter(userId, characterId);

  const relationship = await relationshipService.getRelationship(
    userId,
    characterId,
  );

  const ctx = await buildRuntimeContext({
    characterService,
    relationshipService,
    memoryStore,
    chatRepository,
    userId,
    characterId,
    sessionId,
  });

  const promptResult = await promptBuilder.buildPrompt({
    character,
    relationship,
    memoryContext: ctx.memoryContext,
    message,
    sessionId,
  });

  // ── Unified LLM call through ProviderGateway ──────────────────────────
  const gatewayResponse = await providerGateway.chat({
    userId,
    isVip,
    relationshipStatus: relationship.status,
    characterTier,
    worldTier,
    messages: [
      ...promptResult.messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ],
  });

  const now = Date.now();
  const userMsg: SessionMessage = {
    id: randomUUID(),
    sessionId,
    userId,
    characterId,
    role: "user",
    content: message,
    createdAt: now,
  };
  await chatRepository.saveMessage(userMsg);

  const assistantMsg: SessionMessage = {
    id: randomUUID(),
    sessionId,
    userId,
    characterId,
    role: "assistant",
    content: gatewayResponse.content,
    createdAt: now + 1,
  };
  await chatRepository.saveMessage(assistantMsg);

  const writebackResult = await runMemoryWriteback(memoryStore, {
    userId,
    characterId,
    messages: [
      { role: "user", content: message, timestamp: now },
      { role: "character", content: gatewayResponse.content, timestamp: now + 1 },
    ],
    relationshipDelta: { affection: 0, trust: 0, intimacy: 0, reason: "" },
  });

  const events = detectRelationshipEvents(message, gatewayResponse.content);
  const delta = computeRelationshipDelta(events);

  if (delta.affection !== 0 || delta.trust !== 0 || delta.intimacy !== 0) {
    await relationshipService.updateRelationship(userId, characterId, {
      affection: delta.affection,
      trust: delta.trust,
      intimacy: delta.intimacy,
    });
  }

  return {
    assistantMessage: gatewayResponse.content,
    relationshipDelta: delta,
    memoryEvents: writebackResult.events,
    metadata: {
      sessionId,
      modelId: gatewayResponse.model,
      provider: gatewayResponse.id.includes("deepseek") ? "deepseek"
        : gatewayResponse.id.includes("grok") ? "grok"
        : gatewayResponse.id.includes("openai") ? "openai"
        : "custom",
      tier: isVip ? "vip" : "free",
      latencyMs: gatewayResponse.latencyMs,
      inputTokens: gatewayResponse.usage.inputTokens,
      outputTokens: gatewayResponse.usage.outputTokens,
      memoryCount: writebackResult.events.length,
    },
  };
}

