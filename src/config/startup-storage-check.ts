/**
 * 启动时存储目录检查与自动创建。
 *
 * 兼容 Windows / Linux / macOS。
 * 使用 fs.mkdir(..., { recursive: true })。
 */
import { mkdirSync } from "node:fs";
import { env } from "./env.js";

const DIRS = [
  { label: "DATA_ROOT", path: env.DATA_ROOT },
  { label: "UPLOAD_ROOT", path: env.UPLOAD_ROOT },
  { label: "BACKUP_ROOT", path: env.BACKUP_ROOT },
  { label: "LOG_ROOT", path: env.LOG_ROOT },
  { label: "POSTGRES_DIR", path: env.POSTGRES_DIR },
] as const;

export function runStartupStorageCheck(): void {
  console.log("[Narraverse Storage]");

  for (const { label, path } of DIRS) {
    console.log(`${label}=${path}`);

    mkdirSync(path, { recursive: true });

    if (label === "POSTGRES_DIR") {
      // Also ensure subdirectories for PostgreSQL
      mkdirSync(`${path}\\pg_data`, { recursive: true });
    }

    if (label === "LOG_ROOT") {
      // Ensure logs subdirectory
      mkdirSync(`${path}\\app`, { recursive: true });
    }
  }

  console.log("[Narraverse Storage] 所有存储目录就绪。");
}
