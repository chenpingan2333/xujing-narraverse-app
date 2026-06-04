# 叙境 Narraverse — Data Flow

## Core Conversation Flow

```
User types message (chat/page.tsx)
        │
        ▼
POST /api/chat { userId, characterId, message, sessionId, worldId, ... }
        │
        ▼
┌─ chat/route.ts ─────────────────────────────────────────┐
│  1. Validate input (presence, length ≤ 4000)             │
│  2. Look up character persona                           │
│  3. Build persona fingerprint (persona.builder)         │
│  4. Build system prompt (system-prompt-builder)          │
│     ─ merges: persona + world context + memory +         │
│       relationship state + liveness hints                │
│  5. Call runChat() with assembled dependencies           │
│  6. Compute starCost from input/output tokens            │
│  7. Return { reply, relationshipDelta, memoryEvents,     │
│              metadata: { ..., starCost } }                │
└──────────────────────────────────────────────────────────┘
        │
        ▼
chat/page.tsx receives response
        │
        ├── reply → typewriterEffect (rAF animation)
        ├── relationshipDelta { affection, trust, intimacy, reason }
        │     └── updates relAffection/relTrust/relIntimacy state
        │         └── buildRelationshipUIModel() → warmth/stability/proximity
        │             └── Living Relationship Card renders
        ├── memoryEvents → prepended to memories state
        │     └── Journal panel renders memory fragments
        └── metadata.starCost
              └── deducted from starBalance
                  └── DiamondAnimation triggers
                      └── PurchaseReaction shows emotional feedback
```

## Relationship Data Flow

```
Backend (runChat)                      UI (page.tsx)
─────────────────                      ──────────────
relationshipDelta.affection  ────────► relAffection state (+= delta)
relationshipDelta.trust      ────────► relTrust state     (+= delta)
relationshipDelta.intimacy   ────────► relIntimacy state  (+= delta)
relationshipDelta.reason     ────────► relReason state (text display)
                                          │
                                          ▼
                              buildRelationshipUIModel(affection, trust, intimacy, prevTemp)
                                          │
                                          ▼
                              { warmth, stability, proximity, overallTemp, phase, trend }
                                          │
                                          ▼
                              Living Relationship Card UI
                              ┌─────────────────────────────────┐
                              │  暖意 (warmth)   ── progress bar │
                              │  信任 (stability) ── dot slider  │
                              │  亲近 (proximity) ── dot cluster │
                              │  Phase label + trend indicator   │
                              │  Reason text (italic)            │
                              └─────────────────────────────────┘
```

## Memory Data Flow

```
User sends message
        │
        ▼
runChat() processes conversation
        │
        ▼
Memory Extractor identifies significant moments
        │
        ▼
Memory Store persists events { type, content, importance }
        │
        ▼
API returns memoryEvents[]
        │
        ▼
UI prepends to memories state
        │
        ▼
Journal panel renders:
  ┌─ 记忆片段 ──────────────────┐
  │  "用户分享了今天的感受..."     │
  │  "艾琳回应了关于梦想的对话..." │
  │  ...                        │
  └─────────────────────────────┘
```

## Star Diamond Economy

```
Chat API processes message
        │
        ▼
Compute inputTokens + outputTokens
        │
        ▼
starCost = max(1, ceil((inputTokens + outputTokens) / STAR_DIAMOND_RATE))
        │
        ▼
Response includes metadata.starCost
        │
        ▼
UI: starBalance -= starCost
        │
        ├── DiamondAnimation (visual pulse)
        └── PurchaseReaction
            ├── Warm message ("这份心意让关系更近了...")
            └── Character reaction quote
```

## Provider Failover

```
Request to LLM
    │
    ├── Primary provider (DeepSeek via API key or user key)
    │       │
    │       ├── Success → return response
    │       └── Failure (rate limit / auth / timeout)
    │               │
    ├── Retry with backoff (provider-resilience.ts)
    │       │
    │       ├── Success → return response
    │       └── Failure
    │               │
    └── Fallback error → sanitizeError() → generic user message
```