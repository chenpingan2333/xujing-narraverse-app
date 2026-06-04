import type { Pool } from "pg";

export async function runTransactionMigration(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL,
      type            TEXT NOT NULL,
      amount          INTEGER NOT NULL,
      currency        TEXT NOT NULL DEFAULT 'star',
      balance_before  INTEGER NOT NULL,
      balance_after   INTEGER NOT NULL,
      reference_id    TEXT,
      description     TEXT NOT NULL DEFAULT '',
      created_at      BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(user_id, type);
  `);
}
