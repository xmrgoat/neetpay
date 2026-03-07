CREATE TABLE IF NOT EXISTS card_orders (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id),
    order_type TEXT NOT NULL,
    trocador_trade_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    amount_fiat DOUBLE PRECISION NOT NULL,
    ticker_from TEXT NOT NULL,
    network_from TEXT NOT NULL,
    deposit_address TEXT NOT NULL,
    deposit_amount TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    card_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_card_orders_merchant_id ON card_orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_card_orders_status ON card_orders(status);
CREATE INDEX IF NOT EXISTS idx_card_orders_trocador_trade_id ON card_orders(trocador_trade_id);
