import type { Pool } from "pg";
import type {
  EpisodicMemory,
  MemoryStore,
  MemorySummary,
  PreferenceMemory,
  PromiseMemory,
  PromiseStatus,
  RelationshipMemory,
} from "./types.js";
import { runMigrations } from "./schema.js";
import { env } from "../../../config/env.js";

// ─── Row shapes ──────────────────────────────────────────────────────────────

interface EpisodicRow {
  id: string;
  user_id: string;
  character_id: string;
  event_type: string;
  content: string;
  importance: number;
  created_at: string;
}

interface RelationshipRow {
  id: string;
  user_id: string;
  character_id: string;
  delta_affection: number;
  delta_trust: number;
  delta_intimacy: number;
  reason: string;
  importance: number;
  created_at: string;
}

interface PromiseRow {
  id: string;
  user_id: string;
  character_id: string;
  direction: string;
  content: string;
  status: string;
  importance: number;
  created_at: string;
  resolved_at: string | null;
}

interface PreferenceRow {
  id: string;
  user_id: string;
  character_id: string;
  category: string;
  content: string;
  importance: number;
  created_at: string;
}

interface SummaryRow {
  id: string;
  user_id: string;
  character_id: string | null;
  summary: string;
  source_memory_ids: string[];
  time_range_start: string;
  time_range_end: string;
  importance: number;
  created_at: string;
}

// ─── Row → Domain mappers ────────────────────────────────────────────────────

function toEpisodicMemory(r: EpisodicRow): EpisodicMemory {
  return {
    id: r.id,
    userId: r.user_id,
    characterId: r.character_id,
    eventType: r.event_type as EpisodicMemory["eventType"],
    content: r.content,
    importance: r.importance,
    createdAt: Number(r.created_at),
  };
}

function toRelationshipMemory(r: RelationshipRow): RelationshipMemory {
  return {
    id: r.id,
    userId: r.user_id,
    characterId: r.character_id,
    deltaAffection: r.delta_affection,
    deltaTrust: r.delta_trust,
    deltaIntimacy: r.delta_intimacy,
    reason: r.reason,
    importance: r.importance,
    createdAt: Number(r.created_at),
  };
}

function toPromiseMemory(r: PromiseRow): PromiseMemory {
  return {
    id: r.id,
    userId: r.user_id,
    characterId: r.character_id,
    direction: r.direction as PromiseMemory["direction"],
    content: r.content,
    status: r.status as PromiseMemory["status"],
    importance: r.importance,
    createdAt: Number(r.created_at),
    resolvedAt: r.resolved_at ? Number(r.resolved_at) : null,
  };
}

function toPreferenceMemory(r: PreferenceRow): PreferenceMemory {
  return {
    id: r.id,
    userId: r.user_id,
    characterId: r.character_id,
    category: r.category,
    content: r.content,
    importance: r.importance,
    createdAt: Number(r.created_at),
  };
}

function toMemorySummary(r: SummaryRow): MemorySummary {
  return {
    id: r.id,
    userId: r.user_id,
    characterId: r.character_id,
    summary: r.summary,
    sourceMemoryIds: r.source_memory_ids,
    timeRange: {
      start: Number(r.time_range_start),
      end: Number(r.time_range_end),
    },
    importance: r.importance,
    createdAt: Number(r.created_at),
  };
}

// ─── PostgresMemoryStore ─────────────────────────────────────────────────────

export class PostgresMemoryStore implements MemoryStore {
  private pool: Pool;
  private migrated = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create a PostgresMemoryStore connected to DATABASE_URL.
   * Runs migrations on first use.
   */
  static async create(pool?: Pool): Promise<PostgresMemoryStore> {
    if (pool) {
      const store = new PostgresMemoryStore(pool);
      await store.ensureMigrations();
      return store;
    }

    // Lazy import to avoid pulling pg into test bundles that don't need it
    const { Pool } = await import("pg");
    const pgPool = new Pool({
      connectionString: env.DATABASE_URL,
      min: env.PG_POOL_MIN,
      max: env.PG_POOL_MAX,
    });
    const store = new PostgresMemoryStore(pgPool);
    await store.ensureMigrations();
    return store;
  }

  private async ensureMigrations(): Promise<void> {
    if (this.migrated) return;
    await runMigrations(this.pool);
    this.migrated = true;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // ── Episodic ─────────────────────────────────────────────────────────────

  async addEpisodic(m: EpisodicMemory): Promise<void> {
    await this.pool.query(
      `INSERT INTO episodic_memory (id, user_id, character_id, event_type, content, importance, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [m.id, m.userId, m.characterId, m.eventType, m.content, m.importance, m.createdAt],
    );
  }

  async getEpisodic(userId: string, characterId?: string): Promise<EpisodicMemory[]> {
    const { rows } = await this.pool.query<EpisodicRow>(
      characterId
        ? `SELECT * FROM episodic_memory WHERE user_id=$1 AND character_id=$2 ORDER BY created_at DESC`
        : `SELECT * FROM episodic_memory WHERE user_id=$1 ORDER BY created_at DESC`,
      characterId ? [userId, characterId] : [userId],
    );
    return rows.map(toEpisodicMemory);
  }

  // ── Relationship ─────────────────────────────────────────────────────────

  async addRelationship(m: RelationshipMemory): Promise<void> {
    await this.pool.query(
      `INSERT INTO relationship_memory (id, user_id, character_id, delta_affection, delta_trust, delta_intimacy, reason, importance, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [m.id, m.userId, m.characterId, m.deltaAffection, m.deltaTrust, m.deltaIntimacy, m.reason, m.importance, m.createdAt],
    );
  }

  async getRelationship(userId: string, characterId?: string): Promise<RelationshipMemory[]> {
    const { rows } = await this.pool.query<RelationshipRow>(
      characterId
        ? `SELECT * FROM relationship_memory WHERE user_id=$1 AND character_id=$2 ORDER BY created_at DESC`
        : `SELECT * FROM relationship_memory WHERE user_id=$1 ORDER BY created_at DESC`,
      characterId ? [userId, characterId] : [userId],
    );
    return rows.map(toRelationshipMemory);
  }

  // ── Promise ──────────────────────────────────────────────────────────────

  async addPromise(m: PromiseMemory): Promise<void> {
    await this.pool.query(
      `INSERT INTO promise_memory (id, user_id, character_id, direction, content, status, importance, created_at, resolved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [m.id, m.userId, m.characterId, m.direction, m.content, m.status, m.importance, m.createdAt, m.resolvedAt],
    );
  }

  async getPromises(userId: string, characterId?: string): Promise<PromiseMemory[]> {
    const { rows } = await this.pool.query<PromiseRow>(
      characterId
        ? `SELECT * FROM promise_memory WHERE user_id=$1 AND character_id=$2 ORDER BY created_at DESC`
        : `SELECT * FROM promise_memory WHERE user_id=$1 ORDER BY created_at DESC`,
      characterId ? [userId, characterId] : [userId],
    );
    return rows.map(toPromiseMemory);
  }

  async updatePromise(id: string, status: PromiseStatus, resolvedAt: number): Promise<void> {
    await this.pool.query(
      `UPDATE promise_memory SET status=$1, resolved_at=$2 WHERE id=$3`,
      [status, resolvedAt, id],
    );
  }

  // ── Preference ───────────────────────────────────────────────────────────

  async addPreference(m: PreferenceMemory): Promise<void> {
    await this.pool.query(
      `INSERT INTO preference_memory (id, user_id, character_id, category, content, importance, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [m.id, m.userId, m.characterId, m.category, m.content, m.importance, m.createdAt],
    );
  }

  async getPreferences(userId: string, characterId?: string): Promise<PreferenceMemory[]> {
    const { rows } = await this.pool.query<PreferenceRow>(
      characterId
        ? `SELECT * FROM preference_memory WHERE user_id=$1 AND character_id=$2 ORDER BY created_at DESC`
        : `SELECT * FROM preference_memory WHERE user_id=$1 ORDER BY created_at DESC`,
      characterId ? [userId, characterId] : [userId],
    );
    return rows.map(toPreferenceMemory);
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  async addSummary(s: MemorySummary): Promise<void> {
    await this.pool.query(
      `INSERT INTO memory_summary (id, user_id, character_id, summary, source_memory_ids, time_range_start, time_range_end, importance, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [
        s.id, s.userId, s.characterId, s.summary,
        s.sourceMemoryIds, s.timeRange.start, s.timeRange.end,
        s.importance, s.createdAt,
      ],
    );
  }

  async getSummaries(userId: string, characterId?: string): Promise<MemorySummary[]> {
    const { rows } = await this.pool.query<SummaryRow>(
      characterId
        ? `SELECT * FROM memory_summary WHERE user_id=$1 AND (character_id=$2 OR character_id IS NULL) ORDER BY created_at DESC`
        : `SELECT * FROM memory_summary WHERE user_id=$1 ORDER BY created_at DESC`,
      characterId ? [userId, characterId] : [userId],
    );
    return rows.map(toMemorySummary);
  }
}

