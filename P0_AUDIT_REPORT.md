# P0 安全审计报告 — 叙境 Narraverse

**审计日期**: 2026-06-04  
**审计范围**: P0 核心系统（角色创建限制、对话轮次计数、记忆分级、VIP 定价）  
**审计方法**: 逐文件代码审计 + 数据流追踪

---

## 审计结论总览

| # | 检查项 | 状态 | 风险等级 |
|---|--------|------|----------|
| 1 | 星钻可刷漏洞 | ✅ 已修复 | — |
| 2 | 会员伪造漏洞 | ✅ 安全 | — |
| 3 | 角色创建次数重置漏洞 | ✅ 安全 | — |
| 4 | 记忆容量失效漏洞 | ✅ 已修复 | — |
| 5 | API 权限绕过 | ⚠️ 部分风险 | 🟡 中 |

---

## 1. 星钻可刷漏洞

### 修复前
`logAdWatch()` 在 [user/quota.ts:58](/D:/modelbridge/叙境app/narraverse-app/src/features/narraverse/user/quota.ts:58) 仅执行 INSERT，无任何防重复逻辑。客户端发送 `_adWatched: true` 即可触发奖励，可无限调用。

### 修复后
- 新增 `AD_COOLDOWN_SECONDS = 300`（5分钟冷却）
- `logAdWatch()` 在写入前查询 `ad_watch_logs` 表最近一次观看时间
- 冷却期内调用抛出 `AdCooldownError`
- characters API 和 chat API 均捕获该异常并返回 `{ _adCooldown: true, _remainingSeconds }`

### 残留风险
- 广告奖励（星钻/star diamonds）目前**未实际写入钱包余额** — `logAdWatch` 仅记录日志，不调用 `walletService`。需在支付模块就绪后补齐。
- 冷却时间 300 秒对"创建角色"场景可能偏长，建议后续配置化。

---

## 2. 会员伪造漏洞

### 检查点
- `middleware.ts` → 从 cookie 取 `narra_session` token
- `session.ts:validateSession()` → SHA-256 哈希比对 + 过期检查 + 从 `users` 表读取 `is_vip`、`membership_tier`、`membership_expire_at`
- `chat/route.ts` → `requireAuth()` 覆盖客户端传入的 `userId` 和 `isVip`

### 结论
会员状态**不可由客户端伪造**。`isVip` 由服务端从数据库读取，客户端传入值被 `effectiveIsVip = authCtx.user.isVip` 覆盖。

### 残留风险
- `membership/purchase/route.ts` **未校验支付凭证** — 直接 UPDATE `is_vip = true`。生产环境需接入真实支付回调。
- `membership_expire_at` 超时后的 VIP 失效**无定时任务**清理，依赖每次 `validateSession` 时的字段读取。`is_vip` 布尔值和 `membership_expire_at` 可能不一致。

---

## 3. 角色创建次数重置漏洞

### 检查点
- `userQuotaService.getQuota()` → 查询 `user_quotas` 表（PostgreSQL）
- `userQuotaService.increment()` → `ON CONFLICT ... DO UPDATE` upsert
- 计数键为 `(user_id, quota_type)` 联合主键

### 结论
**持久化到 PostgreSQL，服务器重启不丢失。** 计数由数据库保证原子性。

### 残留风险
- `characters/route.ts` 中的角色数据本身仍存储在**内存 Map** 中，重启丢失。这不影响计数限制，但影响角色数据的持久性。建议后续迁移到 `characters` 表。
- 删除角色时**未递减计数** — 用户删了再建可能触发广告。需后续补充。

---

## 4. 记忆容量失效漏洞

### 修复前
`TieredMemoryStore.checkLimit()` 在 [memory-store.tiered.ts:44](/D:/modelbridge/叙境app/narraverse-app/src/features/narraverse/memory/memory-store.tiered.ts) 直接 `throw new MemoryLimitError`，会导致聊天管道崩溃，用户体验极差。

### 修复后
改为 **LRU 自动驱逐**：
- 收集所有记忆类型，按 `createdAt` 排序
- 驱逐最旧的 `total - limit` 条
- 驱逐时打印日志（可观测）

### 残留风险
- `enforceLimit()` 通过引用匹配删除 — 依赖 `indexOf` 在数组中查找。如果内存地址不一致可能匹配失败。建议后续改为按 `id` 匹配删除。
- 驱逐日志在生产环境应接入监控系统。

---

## 5. API 权限绕过

### 检查点

| API 端点 | 鉴权方式 | 风险 |
|----------|----------|------|
| `POST /api/characters` | `requireAuth()` try/catch，允许未登录 | 🟡 未登录用户可创建角色（dev 模式） |
| `POST /api/chat` | `requireAuth()` try/catch，允许未登录 | 🟡 未登录用户可调用聊天 |
| `POST /api/membership/purchase` | `requireAuth()` 强制要求 | ✅ 安全 |
| `GET /api/characters` | 无鉴权 | 🟢 角色列表公开可接受 |

### 结论
字符创建和聊天 API 在 `requireAuth()` 失败时**静默降级为未登录用户**而非拒绝请求。这是为 dev 便利性设计，但生产环境必须改为强制鉴权。

### 建议
在 `middleware.ts` 中拦截 `/api/characters` 和 `/api/chat`，或在 API 路由中移除 try/catch 降级逻辑。

---

## 附录：修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `src/features/narraverse/user/quota.ts` | 新增广告冷却防刷（`AdCooldownError`、`AD_COOLDOWN_SECONDS`） |
| `src/features/narraverse/memory/memory-store.tiered.ts` | 抛错改为 LRU 自动驱逐 |
| `src/features/narraverse/memory/index.ts` | 移除 `MemoryLimitError` 导出 |
| `app/api/chat/route.ts` | 捕获 `AdCooldownError`，返回友好响应 |
| `app/api/characters/route.ts` | 捕获 `AdCooldownError`，返回友好响应 |

## 下一步建议

1. 🔴 **生产环境强制鉴权** — 移除 chat/characters API 的未登录降级
2. 🔴 **支付回调接入** — membership purchase 需真实支付验证
3. 🟡 **VIP 过期清理** — 定时任务将过期 `is_vip` 设为 false
4. 🟡 **角色数据持久化** — Map 迁移到 PostgreSQL
5. 🟢 **记忆驱逐按 ID 匹配** — 更可靠地删除指定记忆
6. 🟢 **广告奖励入账** — `logAdWatch` 后实际增加钱包星钻
