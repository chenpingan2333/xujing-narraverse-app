# 叙境 Narraverse — Architecture

## Overview

叙境 (Narraverse) is a Next.js 15 AI character chat application with emotional depth. Users converse with AI characters in configurable story worlds. The system tracks relationship dynamics (affection / trust / intimacy), manages memory, and uses a warm, literary design language.

## Directory Layout

```
narraverse-memory-engine/
├── app/                         # Next.js App Router pages
│   ├── chat/page.tsx            # Core chat UI (messages, journal, relationship card)
│   ├── characters/page.tsx      # Character selection
│   ├── worlds/page.tsx          # World/story selection
│   ├── api/chat/route.ts        # POST /api/chat — chat endpoint
│   ├── api/characters/route.ts  # GET/POST /api/characters
│   ├── relationship/            # UI model (warmth/stability/proximity)
│   └── ui/                      # Shared UI components (diamond animation, purchase reaction)
├── src/features/narraverse/     # Domain logic (core engine)
│   ├── chat/                    # Chat runtime, system prompt builder, memory safety
│   ├── memory/                  # Memory store, extraction, retrieval, summarization
│   ├── persona/                 # Persona fingerprint & injection
│   ├── provider/                # LLM provider gateway, routing, resiliency
│   ├── story/                   # Story world engine, NPCs, nodes, pricing
│   ├── payment/                 # Star diamond economy, wallet, orders
│   └── monetization/            # Soft purchase triggers, VIP emotion boost
├── lib/                         # Shared utilities
├── specs/                       # Specification documents
├── docs/                        # This documentation
└── e2e/                         # Playwright end-to-end tests
```

## Layer Architecture

```
┌─────────────────────────────────────────┐
│  UI Layer (app/)                         │
│  React 19 + Next.js 15 + Ant Design 5   │
│  Pages: chat, characters, worlds        │
├─────────────────────────────────────────┤
│  API Layer (app/api/)                    │
│  Next.js Route Handlers                  │
│  chat/route.ts, characters/route.ts     │
├─────────────────────────────────────────┤
│  Domain Layer (src/features/narraverse/) │
│  chat runtime, memory, persona,         │
│  provider gateway, story engine, payment │
├─────────────────────────────────────────┤
│  Infrastructure                          │
│  PostgreSQL (planned), InMemory stores  │
│  DeepSeek provider (configurable)        │
└─────────────────────────────────────────┘
```

## Key Design Decisions

- **In-memory stores** for MVP: memory, chat repository, API keys, and usage tracking all use in-memory implementations with test doubles
- **Provider Gateway pattern**: abstracts LLM providers behind a unified interface with routing, failover, and encryption
- **Persona Fingerprint**: character personality encoded as a structured prompt fragment, built from name, persona text, relationship state, and tier
- **Relationship UI Model**: backend affection/trust/intimacy dimensions reframed as warmth/stability/proximity for emotional display
- **Star Diamond economy**: token usage converted to star diamond cost via `STAR_DIAMOND_RATE`, with emotional feedback on consumption

## Module Boundaries

| Module | Responsibility | Depends On |
|--------|---------------|------------|
| chat | Orchestrates conversation flow, system prompt | memory, persona, provider |
| memory | Stores, retrieves, and summarizes conversation memories | — |
| persona | Builds character personality fingerprints for prompts | — |
| provider | LLM gateway: routing, key management, failover, usage | — |
| story | World state, NPC behavior, narrative nodes | memory |
| payment | Wallet, orders, membership, star diamond pricing | — |
| monetization | Soft purchase triggers, VIP boosts | payment |