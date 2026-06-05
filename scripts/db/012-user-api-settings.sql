-- 叙境 Narraverse — User API settings + worlds columns
-- Migration v12.0

-- User API settings table
CREATE TABLE IF NOT EXISTS user_api_settings (
  user_id           UUID PRIMARY KEY REFERENCES users(id),
  openai_base_url   TEXT DEFAULT '',
  anthropic_base_url TEXT DEFAULT '',
  api_key_encrypted TEXT DEFAULT '',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extra columns for official_worlds (world creation form)
ALTER TABLE official_worlds ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT '';
ALTER TABLE official_worlds ADD COLUMN IF NOT EXISTS world_type TEXT DEFAULT 'custom';
ALTER TABLE official_worlds ADD COLUMN IF NOT EXISTS ai_role TEXT DEFAULT '';
ALTER TABLE official_worlds ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT '';
ALTER TABLE official_worlds ADD COLUMN IF NOT EXISTS premise TEXT DEFAULT '';
