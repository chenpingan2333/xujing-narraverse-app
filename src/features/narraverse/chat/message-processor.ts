import type { ChatMessage } from "./chat.types.js";

/**
 * Normalize and validate an incoming chat message.
 */
export function processMessage(raw: {
  userId: string;
  characterId: string;
  message: string;
  sessionId: string;
}): { userId: string; characterId: string; message: string; sessionId: string } {
  const trimmed = raw.message.trim();

  if (trimmed.length === 0) {
    throw new Error("Message cannot be empty");
  }

  if (trimmed.length > 4096) {
    throw new Error("Message exceeds maximum length of 4096 characters");
  }

  return {
    userId: raw.userId.trim(),
    characterId: raw.characterId.trim(),
    message: trimmed,
    sessionId: raw.sessionId.trim(),
  };
}

/**
 * Build a ChatMessage record from processed input.
 */
export function toChatMessage(
  role: "user" | "assistant",
  content: string,
): ChatMessage {
  return {
    role,
    content,
    timestamp: Date.now(),
  };
}
