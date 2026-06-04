# 叙境 Narraverse — Auth System

## 概述

Production Access Layer 提供了完整的用户身份验证与授权体系，包括：

- **Auth Provider 抽象**：支持 GitHub OAuth 和 Email OTP 两种登录方式，可扩展 Google 等第三方
- **Session 管理**：基于 httpOnly cookie 的 7 天会话，SHA-256 token hash 存储
- **API Key 系统**：VIP 用户可创建 AES-256-GCM 加密的 API Key，支持 provider 级别的访问控制
- **邀请码系统**：内测阶段的 invite-only 访问控制

## Flow

```
用户访问 /chat
    │
    ├── 无 session cookie → 重定向到 /login
    │       ├── GitHub OAuth → GitHub 授权 → callback → 创建/绑定用户 → 创建 session → 重定向 /chat
    │       └── Email OTP → 输入邮箱 → 收到 6 位验证码 → 验证 → 创建/绑定用户 → 创建 session → 重定向 /chat
    │
    ├── 有 session cookie → 验证 token → 获取 userId
    │       │
    │       ├── 未使用邀请码 → 提示输入邀请码
    │       └── 已使用邀请码 → 正常使用
    │
    └── Chat API 调用
            │
            ├── requireAuth() 提取 userId
            ├── userId 注入所有领域服务（memory, relationship, wallet, story）
            └── 所有数据按 userId 隔离
```

## Session Lifecycle

```
创建: POST /api/auth/email/verify 或 GitHub callback
   ↓
活跃: 每次 API 调用更新 last_seen_at
   ↓
过期: 7 天后自动失效（DB + cookie maxAge）
   ↓
销毁: POST /api/auth/session/logout → DB 删除 + cookie 清除
```

## API Key Lifecycle

```
创建: POST /api/keys (仅 VIP)
   ↓  返回完整 key（仅此一次）
   ↓
使用: 在请求头中携带 Authorization: Bearer narra_sk_...
   ↓
查询: GET /api/keys（不返回完整 key）
   ↓
删除: DELETE /api/keys?id=xxx
```