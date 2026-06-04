# 用户访问控制

叙境 Private Beta 的多层访问控制设计，确保用户数据隔离和资源安全。

## 安全层级

```
Layer 1: 认证
  middleware.ts --> 检查 session cookie
  requireAuth() --> 提取 userId + sessionId

Layer 2: 邀请门控
  middleware.ts --> 重定向 /invite-waiting
  invite-waiting page --> 检查邀请状态

Layer 3: 资源隔离
  所有服务层方法校验 userId
  跨用户访问返回 404
  userId 仅来自 session，不来自客户端

Layer 4: 输入校验
  Zod schema 校验所有客户端输入
  拒绝超长文本、无效枚举值
```

## 核心原则

### userId 始终来自服务端 session

```typescript
// ✓ 正确：从 session 获取
const ctx = await requireAuth();
service.create(ctx.userId, input);

// ✗ 错误：从客户端 body 读取
const { userId, ...input } = req.body;
service.create(userId, input);
```

所有 `CreateCharacterRequest` 等 Zod schema **不包含** `userId` 字段。即使客户端发送了该字段，也会被 Zod 的 `strip()` 默认行为丢弃。

### 用户隔离

每个服务方法都接受 `userId` 作为第一参数，内部与资源所有者比对：

```typescript
// CustomCharacterService.ts
get(userId: string, characterId: string): CustomCharacter | null {
  const c = characters.get(characterId);
  if (!c || c.userId !== userId) return null;  // 用户隔离
  return c;
}
```

跨用户访问返回 `null` 或 `false`，API 层统一转换为 404。

### 响应净化

```typescript
// types.ts
export function toCharacterResponse(c: CustomCharacter): CustomCharacterResponse {
  return {
    id: c.id,
    name: c.name,
    // userId 被刻意排除
    ...
  };
}
```

客户端响应类型 `CustomCharacterResponse` 不包含 `userId` 字段。

## 中间件路由表

| 路径模式 | 需要认证 | 需要邀请 | 处理方式 |
|----------|----------|----------|----------|
| `/`, `/login` | 否 | 否 | NextResponse.next() |
| `/api/auth/*` | 否 | 否 | NextResponse.next() |
| `/api/invite/*` | 否 | 否 | NextResponse.next() |
| `/invite-waiting` | 否 | 否 | NextResponse.next() |
| `/chat`, `/api/chat` | 是 | 是 | redirect -> /invite-waiting |
| 其他 | 是 | 否 | NextResponse.next() |

## 限流

`src/lib/auth/rate-limiter.ts` 提供按用户维度的限流：
- `invite-validate:{userId}` — 10次/5分钟
- `invite-redeem:{userId}` — 5次/10分钟

## 安全测试

- `src/features/narraverse/auth/__tests__/user-access-control.test.ts`
  - `userId` 不在 Zod schema 中（编译时 + 运行时双重保护）
  - `AuthContext.userId` 来自 session，不可伪造
  - validate 端点不消耗邀请码
  - redeem 端点 `FOR UPDATE` 原子性
  - redeem 端点时序防御
