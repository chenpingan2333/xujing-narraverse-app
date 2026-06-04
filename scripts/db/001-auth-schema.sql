-- 叙境 Narraverse — Production Auth Schema
-- PostgreSQL migration v1.0

-- ── Users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE,
  name        TEXT NOT NULL DEFAULT '',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_vip      BOOLEAN NOT NULL DEFAULT false,
  is_banned   BOOLEAN NOT NULL DEFAULT false,
  banned_reason TEXT
);

-- ── Auth Providers ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth_providers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,          -- 'github' | 'email'
  provider_id   TEXT,                    -- GitHub user ID (for OAuth)
  email         TEXT,                    -- for email provider
  password_hash TEXT,                    -- bcrypt hash (for email provider)
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_id),
  UNIQUE(provider, email)
);

CREATE INDEX idx_auth_providers_user_id ON auth_providers(user_id);

-- ── Sessions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,    -- SHA-256 of session token
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address    TEXT,
  user_agent    TEXT
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ── Email OTP ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_otps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  code_hash     TEXT NOT NULL,           -- SHA-256 of 6-digit code
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  used          BOOLEAN NOT NULL DEFAULT false,
  attempt_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_email_otps_email ON email_otps(email);
CREATE INDEX idx_email_otps_expires ON email_otps(expires_at);

-- ── API Keys ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT '',
  key_hash      TEXT NOT NULL UNIQUE,     -- SHA-256 of API key (for lookup)
  key_prefix    TEXT NOT NULL,            -- First 8 chars shown in UI (e.g. "narra_sk_")
  encrypted_key TEXT NOT NULL,            -- AES-256-GCM encrypted full key
  provider      TEXT NOT NULL DEFAULT 'deepseek', -- 'deepseek' | 'grok' | 'openai'
  is_active     BOOLEAN NOT NULL DEFAULT true,
  usage_limit   INTEGER,                 -- NULL = unlimited
  usage_count   INTEGER NOT NULL DEFAULT 0,
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

-- ── Invite Codes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invite_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,
  created_by    UUID REFERENCES users(id),
  max_uses      INTEGER NOT NULL DEFAULT 1,
  use_count     INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ
);

CREATE INDEX idx_invite_codes_code ON invite_codes(code);

CREATE TABLE IF NOT EXISTS invite_usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id UUID NOT NULL REFERENCES invite_codes(id) ON DELETE CASCADE,
  used_by       UUID NOT NULL REFERENCES users(id),
  used_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invite_usage_code ON invite_usage(invite_code_id);
CREATE INDEX idx_invite_usage_user ON invite_usage(used_by);

-- ── Wallet (existing payment system binds to user) ─────────
-- wallet is managed by payment module; ensure FK
-- ALTER TABLE wallets ADD CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users(id);