-- 叙境 Narraverse — Add type column to invite_codes
-- Migration v5.0

ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'BASIC';
CREATE INDEX IF NOT EXISTS idx_invite_codes_type ON invite_codes(type);