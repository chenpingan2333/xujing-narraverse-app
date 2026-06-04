import type { Pool } from "pg";

export async function runOrderMigration(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      order_type TEXT NOT NULL,
      amount     INTEGER NOT NULL,
      status     TEXT NOT NULL DEFAULT 'pending',
      target_id  TEXT,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(user_id, created_at DESC);
  `);
}
