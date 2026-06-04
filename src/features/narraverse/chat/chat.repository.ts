/* eslint-disable @typescript-eslint/require-await */

import type { ChatRepository, SessionMessage } from "./chat.types.js";

/**
 * In-memory implementation of ChatRepository.
 * For production, replace with a PostgreSQL-backed implementation.
 */
export class InMemoryChatRepository implements ChatRepository {
  private messages: SessionMessage[] = [];

  async saveMessage(msg: SessionMessage): Promise<void> {
    this.messages.push(msg);
  }

  async getSessionMessages(sessionId: string): Promise<SessionMessage[]> {
    return this.messages
      .filter((m) => m.sessionId === sessionId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async getRecentMessages(
    userId: string,
    characterId: string,
    limit: number,
  ): Promise<SessionMessage[]> {
    return this.messages
      .filter((m) => m.userId === userId && m.characterId === characterId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  clear(): void {
    this.messages = [];
  }
}
