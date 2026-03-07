-- NeetPay core schema (XMR-only)

CREATE TABLE IF NOT EXISTS merchants (
    id          TEXT PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    webhook_url TEXT,
    webhook_secret TEXT,
    xmr_wallet_address TEXT,
    fee_percent DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
    id              TEXT PRIMARY KEY,
    merchant_id     TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    amount_xmr      DOUBLE PRECISION NOT NULL,
    amount_fiat     DOUBLE PRECISION,
    fiat_currency   TEXT,
    subaddress      TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
        -- pending | swap_pending | confirming | paid | expired | failed

    -- Swap details
    swap_provider   TEXT,    -- 'wagyu' | 'trocador'
    swap_order_id   TEXT,
    deposit_address TEXT,
    deposit_chain   TEXT,
    deposit_token   TEXT,
    deposit_amount  DOUBLE PRECISION,

    -- Transaction
    tx_hash         TEXT,
    confirmations   INT NOT NULL DEFAULT 0,

    -- Fee
    fee_percent     DOUBLE PRECISION,
    fee_amount      DOUBLE PRECISION,
    net_amount      DOUBLE PRECISION,

    -- Merchant integration
    callback_url    TEXT,
    return_url      TEXT,
    metadata        JSONB,
    description     TEXT,

    expires_at      TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_merchant ON invoices(merchant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_subaddress ON invoices(subaddress);
CREATE INDEX IF NOT EXISTS idx_invoices_swap_order ON invoices(swap_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_expiry ON invoices(status, expires_at);

CREATE TABLE IF NOT EXISTS api_keys (
    id          TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name        TEXT NOT NULL DEFAULT 'Default',
    key_hash    TEXT NOT NULL UNIQUE,
    key_prefix  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ,
    last_used   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_merchant ON api_keys(merchant_id);

CREATE TABLE IF NOT EXISTS webhook_logs (
    id          TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    invoice_id  TEXT REFERENCES invoices(id) ON DELETE SET NULL,
    url         TEXT NOT NULL,
    payload     TEXT NOT NULL,
    status_code INT NOT NULL,
    success     BOOLEAN NOT NULL,
    attempts    INT NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_merchant ON webhook_logs(merchant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_invoice ON webhook_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_retry ON webhook_logs(success, next_retry_at);
