import { query } from "@/lib/db/pool";
import type { ChatRepository, SessionMessage } from "./chat.types.js";

export class PostgresChatRepository implements ChatRepository {
  async saveMessage(msg: SessionMessage): Promise<void> {
    await query(
      `INSERT INTO chat_messages (id, session_id, user_id, character_id, role, content, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [msg.id, msg.sessionId, msg.userId, msg.characterId, msg.role, msg.content, new Date(msg.createdAt).toISOString()]
    );
  }

  async getSessionMessages(sessionId: string): Promise<SessionMessage[]> {
    const rows = await query<{
      id: string; session_id: string; user_id: string; character_id: string;
      role: string; content: string; created_at: string;
    }>(
      `SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC`,
      [sessionId]
    );
    return rows.map(r => ({
      id: r.id,
      sessionId: r.session_id,
      userId: r.user_id,
      characterId: r.character_id,
      role: r.role as "user" | "assistant",
      content: r.content,
      createdAt: new Date(r.created_at).getTime(),
    }));
  }

  async getRecentMessages(userId: string, characterId: string, limit: number): Promise<SessionMessage[]> {
    const rows = await query<{
      id: string; session_id: string; user_id: string; character_id: string;
      role: string; content: string; created_at: string;
    }>(
      `SELECT * FROM chat_messages WHERE user_id = $1 AND character_id = $2 ORDER BY created_at DESC LIMIT $3`,
      [userId, characterId, limit]
    );
    return rows.map(r => ({
      id: r.id,
      sessionId: r.session_id,
      userId: r.user_id,
      characterId: r.character_id,
      role: r.role as "user" | "assistant",
      content: r.content,
      createdAt: new Date(r.created_at).getTime(),
    }));
  }
}
