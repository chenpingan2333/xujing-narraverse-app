# 叙境 Narraverse — API Contract

## POST /api/chat

Send a message to an AI character and receive a reply.

### Request

```json
{
  "userId": "string (required)",
  "characterId": "string (required) — e.g. 'char-001'",
  "message": "string (required) — max 4000 characters",
  "sessionId": "string (optional) — conversation session ID",
  "isVip": "boolean (optional) — VIP status for routing",
  "characterTier": "'basic' | 'premium' | 'story' (optional)",
  "worldId": "string (optional)",
  "worldTier": "string (optional)",
  "worldType": "'fantasy' | 'scifi' | 'wuxia' (optional)"
}
```

### Success Response (200)

```json
{
  "reply": "string — the character's response",
  "relationshipDelta": {
    "affection": "number — change in affection (-100 to +100)",
    "trust": "number — change in trust (-100 to +100)",
    "intimacy": "number — change in intimacy (-100 to +100)",
    "reason": "string — human-readable reason for the change"
  },
  "memoryEvents": [
    {
      "type": "string — event type (moment, milestone, etc.)",
      "content": "string — the memory fragment text",
      "importance": "number (optional) — 0.0 to 1.0"
    }
  ],
  "metadata": {
    "sessionId": "string",
    "modelId": "string",
    "provider": "string",
    "tier": "string",
    "latencyMs": "number",
    "inputTokens": "number",
    "outputTokens": "number",
    "memoryCount": "number",
    "starCost": "number — diamonds consumed by this message"
  }
}
```

### Error Responses

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "请填写必要信息" }` | Missing userId, characterId, or message |
| 400 | `{ "error": "消息不能为空" }` | Empty message string |
| 400 | `{ "error": "消息过长，请精简后重试" }` | Message > 4000 chars |
| 500 | `{ "error": "AI 服务暂时不可用，请稍后重试" }` | Provider/auth failure |
| 500 | `{ "error": "系统配置错误，请联系管理员" }` | Crypto/key management failure |
| 500 | `{ "error": "服务异常，请稍后重试" }` | Generic server error |

### Error Sanitization

All error messages are sanitized before returning to the client:
- Provider names, API keys, auth tokens are masked
- HTTP status codes from upstream providers are replaced with generic messages
- Stack traces and filesystem paths are stripped
- Encryption/decryption errors return configuration error messages

## GET /api/characters

List all available characters or get a specific one.

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `id` | string (optional) | Get a specific character by ID |

### Success Response (200)

**List (no id param):**
```json
[
  {
    "id": "char-001",
    "name": "艾琳",
    "persona": "温柔体贴的邻家女孩，喜欢分享日常生活中的小确幸",
    "description": "你的贴心伙伴，总是能在你需要的时候给你温暖",
    "tier": "basic",
    "worldId": null,
    "avatar": "🌸",
    "relationship": {
      "affection": 65,
      "trust": 70,
      "intimacy": 55
    }
  }
]
```

**Single (with ?id=char-001):** Same shape as above, but a single object.

### Error Responses

| Status | Body | Condition |
|--------|------|-----------|
| 404 | `{ "error": "Not found" }` | Character ID not found |

## POST /api/characters

Create a custom character.

### Request
```json
{
  "name": "string (required)",
  "persona": "string (required)",
  "description": "string (required)",
  "tier": "'basic' | 'premium' | 'story' (default: 'basic')",
  "avatar": "string (emoji, default: '👤')"
}
```

### Success Response (201)
Returns the created character object.

## Type Guarantees

- All date/time fields are Unix timestamps in milliseconds
- All numeric relationship fields are integers in range [0, 100]
- All string fields are non-null unless explicitly marked optional
- `relationshipDelta` fields may be negative (cooling) or positive (warming)
- `starCost` is always ≥ 1
- `memoryEvents` may be an empty array if no significant moments were detected