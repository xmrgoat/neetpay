-- Magic link tokens for passwordless authentication.
CREATE TABLE IF NOT EXISTS magic_links (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    email       TEXT NOT NULL,
    token_hash  TEXT UNIQUE NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magic_links_token_hash ON magic_links (token_hash);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires ON magic_links (expires_at) WHERE used = FALSE;

-- JWT session tracking (server-side invalidation on logout).
CREATE TABLE IF NOT EXISTS auth_sessions (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    token_hash  TEXT UNIQUE NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_hash ON auth_sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_merchant ON auth_sessions (merchant_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions (expires_at);
