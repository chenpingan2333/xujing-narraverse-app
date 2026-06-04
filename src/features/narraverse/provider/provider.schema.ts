import type { Pool } from "pg";

export async function runProviderMigrations(pool: Pool): Promise<void> {
  await pool.query(`
    -- ── User API Keys ────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS user_api_keys (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL,
      provider          TEXT NOT NULL,
      api_key_encrypted TEXT NOT NULL,
      base_url          TEXT NOT NULL,
      model             TEXT NOT NULL,
      enabled           BOOLEAN NOT NULL DEFAULT true,
      created_at        BIGINT NOT NULL,
      updated_at        BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_user_api_keys_user
      ON user_api_keys(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider
      ON user_api_keys(user_id, provider);

    -- ── Model Usage ──────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS model_usage (
      id             TEXT PRIMARY KEY,
      user_id        TEXT NOT NULL,
      provider       TEXT NOT NULL,
      model          TEXT NOT NULL,
      input_tokens   INTEGER NOT NULL DEFAULT 0,
      output_tokens  INTEGER NOT NULL DEFAULT 0,
      cache_hit      BOOLEAN NOT NULL DEFAULT false,
      cost           REAL NOT NULL DEFAULT 0,
      created_at     BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_model_usage_user
      ON model_usage(user_id);
    CREATE INDEX IF NOT EXISTS idx_model_usage_created
      ON model_usage(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_model_usage_user_month
      ON model_usage(user_id, created_at);
  `);
}
