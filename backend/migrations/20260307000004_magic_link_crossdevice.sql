-- Cross-device magic link support: PC polls for JWT after phone clicks the link.
ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS session_code TEXT;
ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS jwt_result TEXT;
ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS merchant_id_result TEXT;
ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS is_new_result BOOLEAN;
CREATE INDEX IF NOT EXISTS idx_magic_links_session_code ON magic_links (session_code) WHERE session_code IS NOT NULL;
