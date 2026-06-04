import { Pool } from "pg";

const globalPool: { pool: Pool | null } = { pool: null };

function buildConfig() {
  const databaseUrl = process.env["DATABASE_URL"];
  if (databaseUrl) {
    return {
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("neon.tech") ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    };
  }
  return {
    host: process.env["DB_HOST"] ?? "localhost",
    port: Number(process.env["DB_PORT"] ?? 5432),
    database: process.env["DB_NAME"] ?? "narraverse",
    user: process.env["DB_USER"] ?? "narraverse",
    password: process.env["DB_PASSWORD"] ?? "narraverse",
    ssl: (process.env["DB_HOST"] ?? "").includes("neon.tech") ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  };
}

export function getPool(): Pool {
  if (!globalPool.pool) {
    globalPool.pool = new Pool(buildConfig());
  }
  return globalPool.pool;
}

/** Run a parameterized query with automatic pool acquisition */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

/** Run a single-row query, returns null if not found */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Close the pool (for graceful shutdown) */
export async function closePool(): Promise<void> {
  if (globalPool.pool) {
    await globalPool.pool.end();
    globalPool.pool = null;
  }
}