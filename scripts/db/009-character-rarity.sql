-- 叙境 Narraverse — Character rarity system
-- Migration v9.0

-- rarity: normal=普通角色, premium=精品角色(990星钻), story=剧情角色(1990星钻)
ALTER TABLE characters ADD COLUMN IF NOT EXISTS rarity VARCHAR(20) NOT NULL DEFAULT 'normal';

-- price_star: base star-diamond price by rarity
ALTER TABLE characters ADD COLUMN IF NOT EXISTS price_star INTEGER NOT NULL DEFAULT 0;

-- opening_message: character-specific opening message (system-facing, distinct from greeting)
ALTER TABLE characters ADD COLUMN IF NOT EXISTS opening_message TEXT DEFAULT '';

-- relationship_guide: relationship type guidance (e.g. 青梅竹马, 师徒, 上司与下属)
ALTER TABLE characters ADD COLUMN IF NOT EXISTS relationship_guide TEXT DEFAULT '';

-- world_view: the world/universe this character belongs to
ALTER TABLE characters ADD COLUMN IF NOT EXISTS world_view TEXT DEFAULT '';

-- story_nodes: story progression nodes for story characters
ALTER TABLE characters ADD COLUMN IF NOT EXISTS story_nodes JSONB DEFAULT '[]'::jsonb;

-- Index for rarity-based queries
CREATE INDEX IF NOT EXISTS idx_characters_rarity ON characters (rarity);
CREATE INDEX IF NOT EXISTS idx_characters_world_view ON characters (world_view);