-- 叙境 Narraverse — Official worlds system
-- Migration v10.0

CREATE TABLE IF NOT EXISTS official_worlds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT DEFAULT '',
  cover_image   TEXT DEFAULT '',
  price_star    INTEGER NOT NULL DEFAULT 0,
  type          TEXT NOT NULL DEFAULT 'simple',
  creator       TEXT NOT NULL DEFAULT '叙境官方',
  is_official   BOOLEAN NOT NULL DEFAULT true,
  is_verified   BOOLEAN NOT NULL DEFAULT true,
  world_prompt  TEXT DEFAULT '',
  simple_mode   BOOLEAN NOT NULL DEFAULT true,
  rules         JSONB DEFAULT '[]'::jsonb,
  hierarchy     TEXT DEFAULT '',
  glossary      JSONB DEFAULT '{}'::jsonb,
  atmosphere    TEXT DEFAULT '',
  writing_taboos TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_official_worlds_type ON official_worlds (type);
CREATE INDEX IF NOT EXISTS idx_official_worlds_is_official ON official_worlds (is_official) WHERE is_official = true;