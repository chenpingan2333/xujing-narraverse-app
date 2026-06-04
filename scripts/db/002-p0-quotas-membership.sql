-- 叙境 Narraverse — P0: User quotas, membership tiers, memory tiers
-- Migration v2.0

-- ── Extend users table ──────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS character_created_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS conversation_turns INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_tier TEXT;  -- NULL|'monthly'|'quarterly'|'yearly'
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_expire_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT false;

-- ── User quotas table (for fine-grained limit tracking) ─────
CREATE TABLE IF NOT EXISTS user_quotas (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quota_type TEXT NOT NULL,         -- 'character_create' | 'conversation_turn' | 'memory_count'
  current_value INTEGER NOT NULL DEFAULT 0,
  max_value INTEGER NOT NULL,
  reset_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quota_type)
);

-- ── Ad watch log ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_watch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ad_type TEXT NOT NULL,            -- 'character_create' | 'conversation_continue'
  reward_star INTEGER NOT NULL DEFAULT 0,
  watched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_watch_logs_user ON ad_watch_logs(user_id);

-- ── Backfill existing users ─────────────────────────────────
UPDATE users SET is_vip = true WHERE is_vip = true AND membership_tier IS NULL;
