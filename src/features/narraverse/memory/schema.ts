import type { Pool } from "pg";

/**
 * Run all schema migrations.
 * Idempotent — uses IF NOT EXISTS on every table and index.
 */
export async function runMigrations(pool: Pool): Promise<void> {
  await pool.query(`
    -- ── Episodic Memory ──────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS episodic_memory (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL,
      character_id  TEXT NOT NULL,
      event_type    TEXT NOT NULL,
      content       TEXT NOT NULL,
      importance    REAL NOT NULL DEFAULT 0.5,
      created_at    BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_episodic_user
      ON episodic_memory(user_id);
    CREATE INDEX IF NOT EXISTS idx_episodic_user_char
      ON episodic_memory(user_id, character_id);
    CREATE INDEX IF NOT EXISTS idx_episodic_importance
      ON episodic_memory(importance DESC);

    -- ── Relationship Memory ──────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS relationship_memory (
      id               TEXT PRIMARY KEY,
      user_id          TEXT NOT NULL,
      character_id     TEXT NOT NULL,
      delta_affection  INTEGER NOT NULL DEFAULT 0,
      delta_trust      INTEGER NOT NULL DEFAULT 0,
      delta_intimacy   INTEGER NOT NULL DEFAULT 0,
      reason           TEXT NOT NULL DEFAULT '',
      importance       REAL NOT NULL DEFAULT 0.5,
      created_at       BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_relationship_user
      ON relationship_memory(user_id);
    CREATE INDEX IF NOT EXISTS idx_relationship_user_char
      ON relationship_memory(user_id, character_id);

    -- ── Promise Memory ───────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS promise_memory (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL,
      character_id  TEXT NOT NULL,
      direction     TEXT NOT NULL,
      content       TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'active',
      importance    REAL NOT NULL DEFAULT 0.5,
      created_at    BIGINT NOT NULL,
      resolved_at   BIGINT
    );
    CREATE INDEX IF NOT EXISTS idx_promise_user
      ON promise_memory(user_id);
    CREATE INDEX IF NOT EXISTS idx_promise_user_char
      ON promise_memory(user_id, character_id);
    CREATE INDEX IF NOT EXISTS idx_promise_status
      ON promise_memory(status);

    -- ── Preference Memory ────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS preference_memory (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL,
      character_id  TEXT NOT NULL,
      category      TEXT NOT NULL DEFAULT 'general',
      content       TEXT NOT NULL,
      importance    REAL NOT NULL DEFAULT 0.5,
      created_at    BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_preference_user
      ON preference_memory(user_id);
    CREATE INDEX IF NOT EXISTS idx_preference_user_char
      ON preference_memory(user_id, character_id);

    -- ── Memory Summary ───────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS memory_summary (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL,
      character_id      TEXT,
      summary           TEXT NOT NULL,
      source_memory_ids TEXT[] NOT NULL DEFAULT '{}',
      time_range_start  BIGINT NOT NULL,
      time_range_end    BIGINT NOT NULL,
      importance        REAL NOT NULL DEFAULT 0.5,
      created_at        BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_summary_user
      ON memory_summary(user_id);
    CREATE INDEX IF NOT EXISTS idx_summary_user_char
      ON memory_summary(user_id, character_id);

    -- ── Uploads (文件资源元数据) ─────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS uploads (
      id         TEXT PRIMARY KEY,
      file_id    TEXT NOT NULL UNIQUE,
      path       TEXT NOT NULL,
      url        TEXT NOT NULL,
      mime_type  TEXT,
      size_bytes BIGINT,
      created_at BIGINT NOT NULL
    );
  `);
}
