# 叙境 Narraverse — Security Model

## 威胁模型

### 攻击面
1. **未认证访问** — chat/memory/relationship 端点
2. **用户冒充** — 修改请求 body 中的 userId
3. **Session 劫持** — 窃取 cookie
4. **API Key 泄露** — 明文存储或日志泄露
5. **Brute force** — 邀请码/OTP 暴力破解
6. **横向越权** — 用户 A 访问用户 B 的数据

### 防护措施

#### 1. 认证强制
- `middleware.ts` 拦截所有非公开路由，检查 session cookie
- Chat API 使用 `requireAuth()` 提取真实 userId，**覆盖请求 body 中的 userId**
- 中间件允许 `/api/auth/*` 和 `/login` 无需认证

#### 2. Session 安全
- Token: 32 字节加密随机数 (`crypto.randomBytes`)
- 存储: SHA-256 hash（DB 中不存明文 token）
- 传输: httpOnly + secure (production) + sameSite=lax cookie
- 过期: 7 天服务器端过期 + cookie maxAge
- 无 session fixation: 每次登录创建新 session

#### 3. API Key 安全
- 生成: 32 字节随机 hex + `narra_sk_` 前缀
- 存储: DB 存 SHA-256 hash（用于查找）+ AES-256-GCM 加密的完整 key
- 返回: 完整 key 仅在创建时返回一次
- 加密: 使用 `API_KEY_ENCRYPTION_KEY` 派生的密钥，每次加密使用随机 IV
- 日志: console.error 截断至 200 字符，防止 key 泄露

#### 4. OTP 安全
- 6 位数字，10 分钟过期
- 5 次错误尝试后需重新获取
- 5 分钟发送冷却（防止 spam）
- 验证码存储为 SHA-256 hash
- 速率限制: `Retry-After` header

#### 5. 邀请码安全
- 使用次数追踪（`use_count < max_uses`）
- 原子更新（防止 race condition 超额使用）
- 可设置过期时间
- 可禁用

#### 6. 用户数据隔离
- 所有领域查询都带 `userId` 过滤
- `requireAuth()` 在 API 层提取 userId
- Chat API 覆盖 body 中的 userId（防止客户端伪造）
- Memory/wallet/relationship 查询均基于 `userId`

#### 7. 错误信息消毒
- 生产错误不暴露内部细节
- Provider 错误映射为通用中文消息
- 堆栈跟踪和文件路径被正则过滤
- `sanitizeError()` 在 API 层统一处理

## 环境变量安全

| 变量 | 风险 | 缓解措施 |
|------|------|---------|
| `API_KEY_ENCRYPTION_KEY` | 泄露导致所有 API key 可解密 | 生产环境使用密钥管理服务 |
| `SESSION_SECRET` | 泄露可伪造 session | 定期轮换 |
| `GITHUB_CLIENT_SECRET` | 泄露可冒充应用 | GitHub OAuth App 中可重置 |
| `SMTP_PASS` | 泄露可发送垃圾邮件 | 使用应用专用密码 |
| LLM API Keys | 泄露产生费用 | 设置 usage limit + 监控 |

## 生产环境加固建议

- [ ] 启用 CSP headers
- [ ] 添加 rate limiting（建议使用 Vercel KV + `@upstash/ratelimit`）
- [ ] 添加 CORS 白名单
- [ ] 使用 Vercel 环境变量加密
- [ ] 配置 PostgreSQL 连接 SSL
- [ ] 添加审计日志（谁在何时做了什么）
- [ ] 定期轮换 `API_KEY_ENCRYPTION_KEY`