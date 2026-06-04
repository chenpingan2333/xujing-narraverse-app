# 叙境 Narraverse — Deployment Guide

## 前置条件

- Node.js 20+
- PostgreSQL 16+
- pnpm

## 环境变量

复制 `.env.example` 为 `.env`，填写所有必需的变量。

**必须配置：**
- `DATABASE_URL` — PostgreSQL 连接字符串
- `API_KEY_ENCRYPTION_KEY` — 32 字符加密密钥（生产环境必须更换）
- `SESSION_SECRET` — 64 字符会话密钥
- 至少一个 LLM provider 的 API Key（`DEEPSEEK_API_KEY` 等）

**OAuth 配置（可选）：**
- `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` — GitHub OAuth App 凭据
- 在 GitHub → Settings → Developer settings → OAuth Apps 创建
- Callback URL: `https://your-domain.com/api/auth/github/callback`

**SMTP 配置（可选，Email OTP 需要）：**
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

## 数据库初始化

```bash
# 运行 schema 迁移
psql $DATABASE_URL -f scripts/db/001-auth-schema.sql
```

## 本地开发

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

## Vercel 部署

1. 连接 GitHub 仓库到 Vercel
2. 配置环境变量（Settings → Environment Variables）
3. 部署

Vercel 自动检测 Next.js 项目并使用最优配置。

**注意：** Vercel 的无服务器函数有 10 秒超时限制。LLM 调用可能超时，建议使用 Edge Functions 或外部 API 代理。

## Docker 部署（可选）

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://narraverse:narraverse@db:5432/narraverse
    depends_on:
      - db
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: narraverse
      POSTGRES_PASSWORD: narraverse
      POSTGRES_DB: narraverse
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./scripts/db:/docker-entrypoint-initdb.d
volumes:
  pgdata:
```

## 安全检查清单

- [ ] `API_KEY_ENCRYPTION_KEY` 已更换为随机 32 字符密钥
- [ ] `SESSION_SECRET` 已更换为随机 64 字符密钥
- [ ] 所有 LLM provider API keys 已配置
- [ ] 生产环境 `NODE_ENV=production`
- [ ] GitHub OAuth callback URL 指向生产域名
- [ ] SMTP 密码已更改
- [ ] 数据库密码非默认值
- [ ] HTTPS 已启用（Vercel 自动处理）