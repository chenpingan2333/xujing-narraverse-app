-- 叙境 Narraverse — Display name/description for frontend
-- Migration v11.0
-- Original fields (name, description) — kept for model inference
-- Display fields (display_name, display_description) — for frontend UI

ALTER TABLE characters ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT '';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS display_description TEXT DEFAULT '';

-- Backfill existing rows: copy original to display if display is empty
UPDATE characters SET display_name = name WHERE display_name IS NULL OR display_name = '';
UPDATE characters SET display_description = description WHERE display_description IS NULL OR display_description = '';