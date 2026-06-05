-- 叙境 Narraverse — Split API keys per provider
-- Migration v13.0

ALTER TABLE user_api_settings ADD COLUMN IF NOT EXISTS openai_api_key TEXT DEFAULT '';
ALTER TABLE user_api_settings ADD COLUMN IF NOT EXISTS anthropic_api_key TEXT DEFAULT '';
