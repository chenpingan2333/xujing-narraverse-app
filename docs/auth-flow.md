# 叙境 Auth Flow — 登录与邀请完整闭环

## 用户路径

```
                    ┌──────────────────┐
                    │   访问 /chat      │
                    │  /worlds /characters│
                    └────────┬─────────┘
                             │
                    middleware 检查 session
                             │
              ┌──────────────┴──────────────┐
              │ 有 session                   │ 无 session
              ▼                              ▼
      invite-protected?              /login?redirect=original
              │                              │
    ┌─────────┴─────────┐           ┌───────┴────────┐
    │ 是                  │ 否        │ GitHub OAuth    │ Email OTP
    ▼                    ▼           │                 │
/invite-waiting     正常访问         │  callback →    │ send-code
?redirect=original                  │  创建user       │ → verify
    │                               │  创建session    │ → 创建user
    ▼                               └────────┬────────┘
检查 /api/invite/status                       │
    │                               POST /api/invite/status
    ├── invited → redirect original           │
    │                              ┌──────────┴──────────┐
    └── not invited                │ invited = true       │ invited = false
        显示邀请码输入              │ → /chat             │ → /invite-waiting
        │                         └─────────────────────┘
        ▼
    POST /api/invite/redeem
        │
    ┌───┴───┐
    │ 成功   │ 失败
    ▼        ▼
 /chat    重试/提示
```

## 三层安全门控

| 层 | 机制 | 实现位置 |
|----|------|----------|
| 认证 | session cookie (httpOnly, secure, sameSite=lax) | `middleware.ts` + `src/lib/auth/session.ts` |
| 邀请 | 邀请码门控 (BASIC/CREATOR/VIP_TRIAL) | `middleware.ts` + `app/invite-waiting/page.tsx` |
| 资源隔离 | userId 来自 session，服务层校验 | 所有服务层方法 |

## API 清单

### 认证
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/auth/github/login` | GitHub OAuth 跳转 |
| GET | `/api/auth/github/callback` | GitHub OAuth 回调 |
| POST | `/api/auth/email/send-code` | 发送邮箱验证码 |
| POST | `/api/auth/email/verify` | 验证邮箱验证码 |
| GET | `/api/auth/session/me` | 获取当前用户 |
| POST | `/api/auth/session/logout` | 退出登录 |

### 邀请
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/invite` | 查询邀请状态（含类型） |
| POST | `/api/invite` | 使用邀请码 |
| POST | `/api/invite/validate` | 验证邀请码（不消耗） |
| POST | `/api/invite/redeem` | 兑换邀请码（消耗） |
| GET | `/api/invite/status` | 获取当前用户邀请状态 |

### 管理
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/admin/invite/generate` | 管理员生成邀请码 |

## 安全措施

### OTP
- 6位数字，10分钟过期
- 30秒发送冷却
- 5次尝试锁定
- 15分钟内最多10次发送
- 哈希存储（sha256），验证后标记已用

### Session
- httpOnly cookie，production 下 secure
- sameSite=lax
- 7天 TTL
- token 哈希存储

### Invite
- FOR UPDATE 原子消耗
- 200-500ms 随机延迟防时序攻击
- 无效码返回 400（非 404）防枚举
- admin 端点 requireAuth + isAdmin 双检查

### 用户隔离
- userId 永远从 session 获取
- Zod schema 不含 userId 字段
- 响应脱敏（toCharacterResponse 等）

## 数据库表

```
users:          id, email, name, avatar_url, is_vip, is_banned, is_admin, created_at, updated_at
sessions:       id, user_id, token_hash, expires_at, ip_address, user_agent, created_at, last_seen_at
auth_providers: id, user_id, provider, provider_id, email, metadata
email_otps:     id, email, code_hash, expires_at, used, attempt_count, created_at
invite_codes:   id, code, type, created_by, max_uses, use_count, is_active, created_at, expires_at
invite_usage:   id, invite_code_id, used_by, used_at
```

## 不变约束（MUST NOT VIOLATE）

- chat.runtime.ts / provider.gateway.ts / memory engine / story engine / payment / persona system **不可修改**
- userId 100% 从 session，客户端不可传递
- API 响应结构保持兼容

## 测试覆盖

- 49 测试文件，576 测试用例，0 失败
- tsc --noEmit 零错误
- 新增测试文件：
  - `invite-tiers.test.ts` — 邀请等级系统
  - `auth-security.test.ts` — OTP/Session/Invite 安全
  - `login-flow.test.ts` — 完整登录流

## 文件清单

### 新增
- `app/login/page.tsx` — 登录页面
- `app/api/admin/invite/generate/route.ts` — 管理端邀请码生成
- `src/features/narraverse/auth/invite.service.ts` — 邀请服务

### 修改
- `src/features/narraverse/auth/types.ts` — 增加 InviteType / GenerateInviteRequest / isAdmin
- `src/lib/auth/session.ts` — 增加 isAdmin 查询
- `app/api/invite/route.ts` — 增加 tier 支持
- `app/api/invite/redeem/route.ts` — 增加 tier 支持
- `app/api/invite/status/route.ts` — 使用 inviteService
- `app/api/auth/email/send-code/route.ts` — 30s 冷却 + 15分钟限流
- `app/api/auth/email/verify/route.ts` — 返回 invite 状态
- `middleware.ts` — 扩展 INVITE_PROTECTED 路径
- `vitest.config.ts` — 增加 @/ 路径别名
