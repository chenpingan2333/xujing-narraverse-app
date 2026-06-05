-- 叙境 Narraverse — Official character badges & UPSERT support
-- Migration v8.0

ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT false;

-- Unique constraint for UPSERT: one character name per user
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_char_name_per_user') THEN
    ALTER TABLE characters ADD CONSTRAINT unique_char_name_per_user UNIQUE (user_id, name);
  END IF;
END $$;

-- Index for official character queries
CREATE INDEX IF NOT EXISTS idx_characters_is_official ON characters (is_official) WHERE is_official = true;
CREATE INDEX IF NOT EXISTS idx_characters_is_verified ON characters (is_verified) WHERE is_verified = true;
