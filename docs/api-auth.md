# 叙境 Narraverse — Auth API Reference

## Base URL

```
开发: http://localhost:3000
生产: https://your-domain.com
```

## 认证方式

所有需要认证的 API 通过 `narra_session` cookie（httpOnly）进行身份识别。

---

## GitHub OAuth

### GET /api/auth/github/login

重定向到 GitHub OAuth 授权页面。

**响应:** 302 Redirect → GitHub

### GET /api/auth/github/callback

GitHub OAuth 回调。处理授权码，创建/绑定用户，设置 session cookie。

**参数:** `?code=xxx&state=xxx`

**成功:** 302 Redirect → `/chat`
**失败:** 302 Redirect → `/?error=github_auth_failed`

---

## Email OTP

### POST /api/auth/email/send-code

发送 6 位验证码到指定邮箱。

**Body:**
```json
{ "email": "user@example.com" }
```

**成功 200:**
```json
{ "message": "验证码已发送" }
```

**冷却 429:**
```json
{ "error": "请 XX 秒后再试" }
```
Headers: `Retry-After: XX`

**规则:**
- 验证码 6 位纯数字
- 10 分钟过期
- 5 分钟发送冷却
- 5 次错误尝试后需重新获取

### POST /api/auth/email/verify

验证 OTP 并登录。

**Body:**
```json
{ "email": "user@example.com", "code": "123456" }
```

**成功 200:**
```json
{ "message": "登录成功", "userId": "uuid" }
```
同时设置 `narra_session` cookie。

**失败 401:**
```json
{ "error": "验证码错误或已过期" }
```

---

## Session

### GET /api/auth/session/me

获取当前用户信息。

**需要:** `narra_session` cookie

**成功 200:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "username",
    "avatarUrl": "https://...",
    "isVip": false,
    "isBanned": false
  }
}
```

**未认证 401:**
```json
{ "error": "请先登录" }
```

### POST /api/auth/session/logout

退出登录。删除 session 记录并清除 cookie。

**成功 200:**
```json
{ "message": "已退出登录" }
```

---

## API Keys

### GET /api/keys

列出当前用户的所有 API Key（不包含完整 key）。

**需要:** `narra_session` cookie

**成功 200:**
```json
{
  "keys": [
    {
      "id": "uuid",
      "name": "My Key",
      "keyPrefix": "narra_sk_abc12345",
      "provider": "deepseek",
      "isActive": true,
      "usageLimit": 10000,
      "usageCount": 42,
      "createdAt": "2026-06-04T00:00:00.000Z"
    }
  ]
}
```

### POST /api/keys

创建新的 API Key。**仅 VIP 用户可用。**

**Body:**
```json
{
  "name": "My Key",
  "provider": "deepseek",
  "usageLimit": 10000
}
```

**成功 201:**
```json
{
  "key": {
    "name": "My Key",
    "keyPrefix": "narra_sk_abc12345",
    "fullKey": "narra_sk_abc12345...",
    "provider": "deepseek",
    "isActive": true,
    "usageLimit": 10000,
    "usageCount": 0
  }
}
```
⚠️ `fullKey` 仅在此次响应中返回，之后无法再次获取。

**非 VIP 403:**
```json
{ "error": "仅 VIP 用户可创建 API Key" }
```

### DELETE /api/keys?id=xxx

删除指定 API Key。

---

## Invite

### GET /api/invite

检查当前用户是否已使用邀请码。

**成功 200:**
```json
{ "invited": true }
```

### POST /api/invite

使用邀请码。

**Body:**
```json
{ "code": "NARRA-2026-XXXX" }
```

**成功 200:**
```json
{ "message": "欢迎加入叙境内测！" }
```

**失败 400:**
```json
{ "error": "邀请码无效或已用完" }
```