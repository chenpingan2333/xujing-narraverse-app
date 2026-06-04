-- 叙境 Narraverse — Character persistence + Marketplace + Wallet
-- Migration v3.0

-- ── Characters table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  persona TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  tier TEXT NOT NULL DEFAULT 'basic',
  avatar TEXT NOT NULL DEFAULT '✨',
  world_id UUID,
  speech_style TEXT DEFAULT '',
  background TEXT DEFAULT '',
  greeting TEXT DEFAULT '',
  taboos TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_listed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_characters_user_id ON characters(user_id);
CREATE INDEX idx_characters_listed ON characters(is_listed) WHERE is_listed = true;

-- ── Character versions (edit history) ─────────────────────
CREATE TABLE IF NOT EXISTS character_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  persona TEXT NOT NULL,
  description TEXT DEFAULT '',
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(character_id, version_number)
);

-- ── Character marketplace ──────────────────────────────────
CREATE TABLE IF NOT EXISTS character_marketplace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id),
  price INTEGER NOT NULL CHECK (price IN (490, 990, 1990)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'delisted')),
  sales_count INTEGER NOT NULL DEFAULT 0,
  revenue INTEGER NOT NULL DEFAULT 0,
  listed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(character_id)
);

CREATE INDEX idx_marketplace_status ON character_marketplace(status) WHERE status = 'active';
CREATE INDEX idx_marketplace_creator ON character_marketplace(creator_id);

-- ── Wallets table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  star_diamonds INTEGER NOT NULL DEFAULT 0 CHECK (star_diamonds >= 0),
  creator_diamonds INTEGER NOT NULL DEFAULT 0 CHECK (creator_diamonds >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- ── Transactions table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'star' CHECK (currency IN ('star', 'creator')),
  balance_before INTEGER NOT NULL DEFAULT 0,
  balance_after INTEGER NOT NULL DEFAULT 0,
  reference_id TEXT,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- ── Purchased character copies ─────────────────────────────
CREATE TABLE IF NOT EXISTS purchased_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES users(id),
  original_character_id UUID NOT NULL REFERENCES characters(id),
  marketplace_id UUID NOT NULL REFERENCES character_marketplace(id),
  copy_character_id UUID NOT NULL REFERENCES characters(id),
  price_paid INTEGER NOT NULL,
  creator_share INTEGER NOT NULL,
  platform_share INTEGER NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
