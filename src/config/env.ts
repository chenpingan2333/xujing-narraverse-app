/**
 * 统一存储路径配置。
 *
 * 所有路径必须通过环境变量读取，禁止硬编码磁盘路径。
 *
 * 环境变量：
 *   DATA_ROOT    — 用户数据根目录
 *   POSTGRES_DIR — PostgreSQL 数据目录
 *   UPLOAD_ROOT  — 文件上传目录
 *   BACKUP_ROOT  — 数据库备份目录
 *   LOG_ROOT     — 日志目录
 *   DATABASE_URL — PostgreSQL 连接字符串
 *   PG_POOL_MIN  — 连接池最小连接数
 *   PG_POOL_MAX  — 连接池最大连接数
 */

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(
      `[env] 缺少必需的环境变量: ${key}。请检查 .env 配置。`,
    );
  }
  return val;
}

export const env = {
  get DATA_ROOT(): string {
    return requireEnv("DATA_ROOT");
  },

  get POSTGRES_DIR(): string {
    return requireEnv("POSTGRES_DIR");
  },

  get UPLOAD_ROOT(): string {
    return requireEnv("UPLOAD_ROOT");
  },

  get BACKUP_ROOT(): string {
    return requireEnv("BACKUP_ROOT");
  },

  get LOG_ROOT(): string {
    return requireEnv("LOG_ROOT");
  },

  get DATABASE_URL(): string {
    return requireEnv("DATABASE_URL");
  },

  PG_POOL_MIN: Number(process.env["PG_POOL_MIN"] ?? "2"),
  PG_POOL_MAX: Number(process.env["PG_POOL_MAX"] ?? "10"),
} as const;
