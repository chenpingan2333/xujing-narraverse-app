# 叙境 Narraverse — SYSTEM_SPEC v2

> 最后更新：2026-06-05  
> 生产地址：https://app.modelbridge.top  
> GitHub：https://github.com/chenpingan2333/xujing-narraverse-app  
> 运行时：Next.js 15.5 (App Router) + Neon PostgreSQL (serverless) + Vercel

---

## 1. 架构总览

`
┌─────────────────────────────────────────────┐
│  Vercel Edge (middleware.ts)                │
│  ├─ Auth guard: session cookie → /login     │
│  └─ Invite gate: REQUIRE_INVITE flag        │
├─────────────────────────────────────────────┤
│  Next.js App Router (app/)                  │
│  ├─ /login          → 唯一入口             │
│  ├─ /characters     → 角色库               │
│  ├─ /chat           → AI 对话              │
│  ├─ /marketplace    → 角色商店             │
│  ├─ /profile        → 我的                 │
│  ├─ /wallet         → 钱包                 │
│  ├─ /settings       → API密钥/VIP          │
│  ├─ /worlds         → 世界                 │
│  └─ /membership     → 会员                 │
├─────────────────────────────────────────────┤
│  BottomNav: 角色 | 聊天 | 商店 | 我的 (4tab)│
├─────────────────────────────────────────────┤
│  Neon PostgreSQL                            │
│  ├─ users, auth_providers, sessions         │
│  ├─ characters, character_marketplace       │
│  ├─ wallets, transactions                   │
│  ├─ user_characters (M:N)                   │
│  ├─ api_keys, user_api_settings             │
│  ├─ official_worlds, user_memberships       │
│  └─ recharge_orders, invite_codes           │
└─────────────────────────────────────────────┘
`

---

## 2. 数据库 Schema

### 2.1 用户 & 认证

| 表 | 关键字段 | 说明 |
|---|---|---|
| users | id UUID PK, email UNIQUE, uid_display TEXT, is_vip BOOL, membership_tier, membership_expire_at | UID 格式：NAR_000001（自增） |
| uth_providers | user_id FK, provider (github/email), password_hash (bcrypt), provider_id | UNIQUE(provider, provider_id) |
| sessions | user_id FK, 	oken_hash (SHA-256), expires_at | 登录会话 |
| email_otps | email, code_hash (SHA-256), expires_at, used | 邮件验证码 |
| invite_codes | code UNIQUE, max_uses, use_count | 邀请码 |
| invite_usage | invite_code_id FK, used_by FK | 邀请使用记录 |

### 2.2 角色 & 商店

| 表 | 关键字段 | 说明 |
|---|---|---|
| characters | id UUID PK, user_id FK, 
ame, persona, 	ier (basic/premium/story), is_listed, vatar | 角色本体 |
| character_versions | character_id FK, ersion_number, 
ame, persona | 编辑历史 |
| character_marketplace | character_id FK UNIQUE, creator_id FK, price (490/990/1990), status (active/sold/delisted) | 上架商店 |
| user_characters | user_id, character_id (复合PK) | 用户拥有的人物 |
| purchased_characters | uyer_id, original_character_id, copy_character_id, price_paid, creator_share, platform_share | 购买记录 |

### 2.3 经济系统

| 表 | 关键字段 | 说明 |
|---|---|---|
| wallets | user_id UNIQUE, star_diamonds, creator_diamonds | 用户钱包 |
| 	ransactions | user_id FK, 	ype, mount, currency (star/creator), alance_before/after | 交易流水 |
| echarge_orders | user_id FK, package_stars, package_price, payment_method (wechat/alipay), status | 充值订单 |
| dmin_wallet_ops | dmin_id, 	arget_user_id, operation (add_stars/deduct_stars) | 管理员操作日志 |

### 2.4 会员 & 配额

| 表 | 关键字段 | 说明 |
|---|---|---|
| user_memberships | user_id FK, plan (monthly/quarterly/yearly), price_stars, expire_at, is_first_purchase | 会员历史 |
| user_quotas | user_id + quota_type PK, current_value, max_value, eset_at | 配额追踪 |
| d_watch_logs | user_id, d_type, eward_star | 广告观看日志 |

### 2.5 世界 & 设置

| 表 | 关键字段 | 说明 |
|---|---|---|
| official_worlds | id UUID PK, 
ame, world_prompt, simple_mode, ules JSONB, glossary JSONB | 官方世界 |
| pi_keys | user_id FK, key_hash, encrypted_key (AES-256-GCM), provider | 用户 API 密钥 |
| user_api_settings | user_id PK, openai_base_url, nthropic_base_url | 自定义 API 端点 |

---

## 3. API 路由清单（36 个端点）

### Auth
- POST /api/auth/login — 邮箱+密码登录（bcrypt）
- POST /api/auth/email/send-code — 发送6位验证码
- POST /api/auth/email/register — 验证码注册
- POST /api/auth/email/verify — 验证邮箱
- GET /api/auth/github/login — GitHub OAuth 跳转
- GET /api/auth/github/callback — GitHub OAuth 回调
- GET /api/auth/session/me — 当前会话
- POST /api/auth/session/logout — 登出

### Characters
- GET /api/characters — 公开角色列表
- GET /api/characters/my — 我的角色
- POST /api/characters/custom — 创建角色
- POST /api/characters/import — 批量导入（容错）
- GET /api/characters/[id] — 角色详情
- PUT /api/characters/[id] — 更新角色
- POST /api/characters/[id]/bind-world — 绑定世界
- POST /api/characters/[id]/copy — 复制角色
- GET /api/characters/[id]/export — 导出角色

### Chat
- POST /api/chat — AI 对话（流式/非流式）

### Marketplace
- GET /api/marketplace — 角色商店列表（支持 sort、tag 筛选）
- POST /api/marketplace/purchase — 购买角色（事务：扣星钻→创建副本→记录购买）

### Wallet & Economy
- GET /api/wallet — 钱包余额
- GET /api/wallet/history — 交易记录
- POST /api/recharge/order — 创建充值订单（事务）

### Membership
- POST /api/membership/purchase — 购买会员

### Settings & Keys
- GET /api/settings — 获取设置（含 VIP 状态）
- POST /api/settings — 保存 API 设置
- GET /api/keys — API 密钥列表
- POST /api/keys — 创建 API 密钥

### Worlds
- GET /api/worlds — 世界列表
- POST /api/worlds/create — 创建世界
- GET /api/worlds/[id]/characters — 世界内角色

### Invite
- POST /api/invite — 创建邀请码
- POST /api/invite/redeem — 兑换邀请码
- GET /api/invite/status — 邀请状态
- GET /api/invite/validate — 验证邀请码

### Admin
- POST /api/admin/wallet — 管理员操作钱包
- POST /api/admin/invite/generate — 管理员生成邀请码

### Other
- GET /api/onboarding — 新手引导
- GET /api/profile/stats — 个人统计

---

## 4. 前端路由 & 组件

### 页面路由
| 路径 | 页面 | 认证 | BottomNav |
|---|---|---|---|
| / | 重定向 → /login | 否 | 否 |
| /login | 登录/注册 | 否 | 否 |
| /characters | 角色库 | 是 | 是 |
| /characters/create | 创建角色 | 是 | 否 |
| /character/import | 导入角色 | 是 | 否 |
| /chat | AI 对话 | 是 | 是 |
| /marketplace | 角色商店 | 是 | 是 |
| /marketplace/[id] | 角色详情+购买 | 是 | 否 |
| /profile | 我的 | 是 | 是 |
| /wallet | 钱包 | 是 | 否 |
| /settings | API密钥/VIP | 是 | 否 |
| /worlds | 世界列表 | 是 | 否 |
| /worlds/create | 创建世界 | 是 | 否 |
| /membership | 会员购买 | 是 | 否 |
| /recharge | 充值 | 是 | 否 |
| /admin/wallet | 管理员钱包 | 是 | 否 |
| /invite-waiting | 邀请码等待 | 否 | 否 |

### 核心组件
- AuthenticatedLayout — 包裹 BottomNav 的主要页面布局
- BottomNav — 固定底部4tab导航（角色/聊天/商店/我的），适配 safe-area
- BackButton — 返回按钮组件

### 认证流
1. 用户访问任何受保护路由 → middleware 检查 session cookie
2. 无 session → 重定向到 /login?redirect=原路径
3. 登录成功 → 重定向到原路径（默认 /chat）
4. 根路径 / → 无条件重定向到 /login

---

## 5. Marketplace 定价

| 角色 | 稀有度 | 价格（星钻） |
|---|---|---|
| 一之濑明日奈 | Rare (rare) | 490 ★ |
| 鸢尾花 | Rare (rare) | 490 ★ |
| Emma | Epic (epic) | 990 ★ |
| 艾莉娅和阿米莉亚 | Epic (epic) | 990 ★ |

免费角色（所有用户自动获得）：橘光、雫崎富香

---

## 6. UID 规则

- 格式：NAR_ + 6位数字（如 NAR_000001）
- 按 created_at 顺序自增分配
- 不存在 NAR_000000
- 通过数据库中 ROW_NUMBER() OVER (ORDER BY created_at) 生成

---

## 7. 关键工程决策

### 7.1 事务与容错
- 4 个高风险 API 使用 BEGIN/COMMIT/ROLLBACK：角色购买、充值创建、角色导入、会员购买
- withErrorHandler 包装所有关键路由，统一500处理

### 7.2 安全
- Session cookie：__Secure-narraverse-session，HttpOnly + Secure + SameSite=Lax
- 密码：bcrypt 哈希存储于 uth_providers
- API 密钥：AES-256-GCM 加密存储于 pi_keys
- 验证码：SHA-256 哈希存储于 email_otps

### 7.3 CSS & 响应式
- .mobile-safe-page：min-height: 100dvh + env(safe-area-inset-*)
- 品牌色系：#fffaf5（背景）、#5C4033（主文字）、#f6c177 → #f0a860（渐变按钮）、#B08968（辅助文字）
- 字体：Georgia / Noto Serif SC / Songti SC

### 7.4 部署
- Vercel (Hobby plan)，环境变量 DATABASE_URL、SESSION_SECRET、GITHUB_ID/SECRET、RESEND_API_KEY
- Resend 邮件服务（modelbridge.top 域名）
- 无 CI pipeline，手动 ercel --prod 部署

---

## 8. 待办 & 风险

- [ ] Playwright 真实设备 E2E 测试
- [ ] APK v1.1.6 构建（含 BottomNav 改动）
- [ ] 充值系统 WeChat/Alipay 真实对接（当前为手动 fulfillment）
- [ ] REQUIRE_INVITE 邀请制默认关闭
- [ ] 图片生成/AI 生图集成