import { z } from "zod";

// ─── External Domain Interfaces (injected dependencies) ─────────────────────

export interface CharacterData {
  id: string;
  userId: string;
  name: string;
  persona: string;
  description: string;
  avatarUrl?: string;
  config: Record<string, unknown>;
}

export interface RelationshipData {
  userId: string;
  characterId: string;
  affection: number;
  trust: number;
  intimacy: number;
  status: string;
}

export interface PromptBuildResult {
  systemPrompt: string;
  userPrompt: string;
  messages: Array<{ role: string; content: string }>;
}

export interface ModelSelection {
  modelId: string;
  provider: string;
  tier: string;
}

export interface LLMResponse {
  content: string;
  modelId: string;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
}

// ─── Domain Service Interfaces ──────────────────────────────────────────────

export interface CharacterService {
  getCharacter(userId: string, characterId: string): Promise<CharacterData>;
}

export interface RelationshipService {
  getRelationship(userId: string, characterId: string): Promise<RelationshipData>;
  updateRelationship(
    userId: string,
    characterId: string,
    deltas: { affection: number; trust: number; intimacy: number },
  ): Promise<RelationshipData>;
}

export interface PromptBuilder {
  buildPrompt(params: {
    character: CharacterData;
    relationship: RelationshipData;
    memoryContext: string;
    message: string;
    sessionId: string;
  }): Promise<PromptBuildResult>;
}

export interface ModelRouter {
  resolveTier(params: { character: CharacterData; message: string }): string;
  selectModel(tier: string): Promise<ModelSelection>;
}

export interface LLMClient {
  chat(params: {
    modelId: string;
    provider: string;
    messages: Array<{ role: string; content: string }>;
  }): Promise<LLMResponse>;
}

// ─── Chat Runtime Types ─────────────────────────────────────────────────────

export const ChatMessage = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.number(),
});
export type ChatMessage = z.infer<typeof ChatMessage>;

export const SessionMessage = z.object({
  id: z.string(),
  sessionId: z.string(),
  userId: z.string(),
  characterId: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.number(),
});
export type SessionMessage = z.infer<typeof SessionMessage>;

export const RelationshipDelta = z.object({
  affection: z.number(),
  trust: z.number(),
  intimacy: z.number(),
  reason: z.string(),
});
export type RelationshipDelta = z.infer<typeof RelationshipDelta>;

export const MemoryEvent = z.object({
  type: z.enum(["episodic", "relationship", "promise", "preference"]),
  content: z.string(),
  importance: z.number().min(0).max(1),
});
export type MemoryEvent = z.infer<typeof MemoryEvent>;

export const ChatResult = z.object({
  assistantMessage: z.string(),
  relationshipDelta: RelationshipDelta,
  memoryEvents: z.array(MemoryEvent),
  metadata: z.object({
    sessionId: z.string(),
    modelId: z.string(),
    provider: z.string(),
    tier: z.string(),
    latencyMs: z.number(),
    inputTokens: z.number(),
    outputTokens: z.number(),
    memoryCount: z.number(),
  }),
});
export type ChatResult = z.infer<typeof ChatResult>;

export const ChatInput = z.object({
  userId: z.string(),
  characterId: z.string(),
  message: z.string().min(1),
  sessionId: z.string(),
  isVip: z.boolean().default(false),
  characterTier: z.string().optional(),
  worldTier: z.string().optional(),
});
export type ChatInput = z.infer<typeof ChatInput>;

// ─── Runtime Context ──────────────────────────────────────────────────────

export const RuntimeContext = z.object({
  character: z.object({
    id: z.string(),
    name: z.string(),
    persona: z.string(),
    description: z.string(),
    avatarUrl: z.string().optional(),
  }),
  relationship: z.object({
    affection: z.number(),
    trust: z.number(),
    intimacy: z.number(),
    status: z.string(),
  }),
  memoryContext: z.string(),
  sessionId: z.string(),
  sessionMessages: z.array(SessionMessage),
});
export type RuntimeContext = z.infer<typeof RuntimeContext>;

// ─── RFC 7807 Error ──────────────────────────────────────────────────────

export const ProblemDetail = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string(),
});
export type ProblemDetail = z.infer<typeof ProblemDetail>;

export function problem(
  type: string,
  title: string,
  status: number,
  detail: string,
): ProblemDetail {
  return { type, title, status, detail };
}

// ─── Repository Interfaces ────────────────────────────────────────────────

export interface ChatRepository {
  saveMessage(msg: SessionMessage): Promise<void>;
  getSessionMessages(sessionId: string): Promise<SessionMessage[]>;
  getRecentMessages(
    userId: string,
    characterId: string,
    limit: number,
  ): Promise<SessionMessage[]>;
}

// ─── Event Types for Relationship Updater ─────────────────────────────────

export type RelationshipEventType =
  | "gift"
  | "compliment"
  | "care"
  | "companionship"
  | "promise_kept"
  | "argument"
  | "coldness"
  | "promise_broken";

export interface RelationshipEvent {
  type: RelationshipEventType;
  intensity: number; // 0 to 1
  description: string;
}

