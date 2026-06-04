import type { Pool } from "pg";

export async function runMembershipMigration(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS memberships (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      plan       TEXT NOT NULL,
      start_at   BIGINT NOT NULL,
      expire_at  BIGINT NOT NULL,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
    CREATE INDEX IF NOT EXISTS idx_memberships_active ON memberships(user_id, expire_at DESC);
  `);
}
