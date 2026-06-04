import type { Pool } from "pg";

export async function runWalletMigration(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wallets (
      id               TEXT PRIMARY KEY,
      user_id          TEXT NOT NULL UNIQUE,
      star_diamonds    INTEGER NOT NULL DEFAULT 0 CHECK (star_diamonds >= 0),
      creator_diamonds INTEGER NOT NULL DEFAULT 0 CHECK (creator_diamonds >= 0),
      created_at       BIGINT NOT NULL,
      updated_at       BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
  `);
}
