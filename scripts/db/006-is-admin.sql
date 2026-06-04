-- 叙境 Narraverse — Add is_admin column to users
-- Migration v6.0 — fixes session validation failure

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Set the first user (by creation date) as admin, if any users exist
UPDATE users SET is_admin = true 
WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM users WHERE is_admin = true);
