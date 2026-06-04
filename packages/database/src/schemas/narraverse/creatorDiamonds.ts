import type { Pool } from "pg";

export async function runCreatorDiamondMigration(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS creator_diamond_logs (
      id                      TEXT PRIMARY KEY,
      creator_id              TEXT NOT NULL,
      source_character_id     TEXT,
      source_world_package_id TEXT,
      income                  INTEGER NOT NULL DEFAULT 0 CHECK (income >= 0),
      expense                 INTEGER NOT NULL DEFAULT 0 CHECK (expense >= 0),
      description             TEXT NOT NULL DEFAULT '',
      created_at              BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_creator_diamond_logs_creator ON creator_diamond_logs(creator_id);
    CREATE INDEX IF NOT EXISTS idx_creator_diamond_logs_created ON creator_diamond_logs(creator_id, created_at DESC);
  `);
}
