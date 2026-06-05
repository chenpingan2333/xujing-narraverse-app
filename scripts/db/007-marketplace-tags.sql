-- 叙境 Narraverse — Add tags column to character_marketplace
-- Migration v7.0 — supports tag filtering for official characters

ALTER TABLE character_marketplace ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Index for tag search
CREATE INDEX IF NOT EXISTS idx_marketplace_tags ON character_marketplace USING GIN (tags);
