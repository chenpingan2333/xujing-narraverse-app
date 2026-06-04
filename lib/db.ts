import { Pool } from "pg";

const pool = new Pool({
  host: process.env["DB_HOST"] ?? "localhost",
  port: Number(process.env["DB_PORT"] ?? "5432"),
  database: process.env["DB_NAME"] ?? "narraverse",
  user: process.env["DB_USER"] ?? "narraverse",
  password: process.env["DB_PASSWORD"] ?? "narraverse",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export function getPool(): Pool {
  return pool;
}

export async function query(text: string, params?: unknown[]) {
  return pool.query(text, params);
}

export async function healthCheck(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
