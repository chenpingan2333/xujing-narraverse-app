# 内测邀请系统

叙境（Narraverse）Private Beta 的邀请码门控系统，确保只有持有有效邀请码的用户才能访问核心对话功能。

## 架构概览

```
用户访问 /chat
       |
       v
  中间件检查 session
       |-- 无 session --> 重定向 /login
       |-- 有 session --> 重定向 /invite-waiting
                           |
                           v
                      /invite-waiting 页面
                      |-- 调用 GET /api/invite/status
                      |   if invited --> 重定向 /chat
                      |   if not --> 展示邀请码输入
                      |
                      v
                   用户输入邀请码
                      |
                      v
                   POST /api/invite/redeem
                      |
                      v
                    兑换成功 --> 重定向 /chat
```

## API 端点

| 方法 | 路径 | 描述 | 限流 |
|------|------|------|------|
| GET | `/api/invite/status` | 查询用户邀请状态（不消耗） | 无需限流 |
| POST | `/api/invite/validate` | 验证邀请码有效性（不消耗） | 10次/5分钟 |
| POST | `/api/invite/redeem` | 使用邀请码（消耗） | 5次/10分钟 |
| GET | `/api/invite` | 检查是否已邀请 | 无需限流 |
| POST | `/api/invite` | 使用邀请码（旧版兼容） | 无需限流 |

## 安全设计

### validate vs redeem 分离
- `/validate` 仅查询邀请码是否存在，**不修改** `use_count` 或写入 `invite_usage`
- `/redeem` 才真正消耗邀请码
- 防止攻击者通过验证接口耗尽有效邀请码

### 原子消耗
`redeem` 端点使用 `SELECT ... FOR UPDATE` 锁定行，确保两个用户不会同时消耗同一邀请码。

### 时序防御
`redeem` 端点在校验失败时添加 200-500ms 随机延迟，防止通过响应时间区分有效/无效邀请码。

### 服务端 userId
所有邀请操作从 session 获取 userId，不从客户端 body 读取。防止 userId 伪造。

### 幂等性
已邀请用户再次使用邀请码返回 `alreadyInvited: true`，不会重复写入 `invite_usage`。

## 限流

`src/lib/auth/rate-limiter.ts` — 基于内存的限流器：
- 按 key + window 独立计数
- 自动过期清理（每60秒）
- 返回 `{ allowed, remaining, resetAt }`

## 中间件更新

`middleware.ts` 的改动：
- `PUBLIC_PATHS` 新增 `/api/invite` 和 `/invite-waiting`
- `INVITE_PROTECTED` 路径（`/chat`, `/api/chat`）被重定向到 `/invite-waiting?redirect=原路径`
- 邀请等待页面核对邀请状态后自动跳转到目标路径

## 数据库表

```sql
invite_codes:
  id, code, created_by, max_uses, use_count, is_active, created_at, expires_at

invite_usage:
  id, invite_code_id, used_by, used_at
```

## 测试覆盖

- `src/features/narraverse/auth/__tests__/invite-gate.test.ts` — 限流器行为
- `src/features/narraverse/auth/__tests__/user-access-control.test.ts` — 安全约束
- `src/features/narraverse/characters/__tests__/beta-flow.test.ts` — 完整 beta 流程
