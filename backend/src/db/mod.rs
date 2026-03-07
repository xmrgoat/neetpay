use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::*;

// ---------------------------------------------------------------------------
// Merchants
// ---------------------------------------------------------------------------

pub async fn create_merchant(pool: &PgPool, input: NewMerchant) -> Result<Merchant, sqlx::Error> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let fee = input.fee_percent.unwrap_or(0.4);

    let merchant = sqlx::query_as::<_, Merchant>(
        r#"
        INSERT INTO merchants (id, email, hashed_password, webhook_url, webhook_secret, xmr_wallet_address, fee_percent, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        "#,
    )
    .bind(&id)
    .bind(&input.email)
    .bind(&input.hashed_password)
    .bind(&input.webhook_url)
    .bind(&input.webhook_secret)
    .bind(&input.xmr_wallet_address)
    .bind(fee)
    .bind(now)
    .bind(now)
    .fetch_one(pool)
    .await?;

    Ok(merchant)
}

pub async fn get_merchant_by_id(pool: &PgPool, id: &str) -> Result<Option<Merchant>, sqlx::Error> {
    sqlx::query_as::<_, Merchant>("SELECT * FROM merchants WHERE id = $1")
        .bind(id)
        .fetch_optional(pool)
        .await
}

pub async fn get_merchant_by_email(
    pool: &PgPool,
    email: &str,
) -> Result<Option<Merchant>, sqlx::Error> {
    sqlx::query_as::<_, Merchant>("SELECT * FROM merchants WHERE email = $1")
        .bind(email)
        .fetch_optional(pool)
        .await
}

pub async fn get_merchant_by_api_key_hash(
    pool: &PgPool,
    key_hash: &str,
) -> Result<Option<Merchant>, sqlx::Error> {
    sqlx::query_as::<_, Merchant>(
        r#"
        SELECT m.* FROM merchants m
        INNER JOIN api_keys ak ON ak.merchant_id = m.id
        WHERE ak.key_hash = $1
          AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
        "#,
    )
    .bind(key_hash)
    .fetch_optional(pool)
    .await
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

pub async fn create_invoice(pool: &PgPool, input: NewInvoice) -> Result<Invoice, sqlx::Error> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let status = input.status.as_deref().unwrap_or("pending");

    let invoice = sqlx::query_as::<_, Invoice>(
        r#"
        INSERT INTO invoices (
            id, merchant_id, amount_xmr, amount_fiat, fiat_currency, subaddress, status,
            swap_provider, swap_order_id, deposit_address, deposit_chain, deposit_token, deposit_amount,
            fee_percent, fee_amount, net_amount,
            callback_url, return_url, metadata, description,
            expires_at, created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
        RETURNING *
        "#,
    )
    .bind(&id)
    .bind(&input.merchant_id)
    .bind(input.amount_xmr)
    .bind(input.amount_fiat)
    .bind(&input.fiat_currency)
    .bind(&input.subaddress)
    .bind(status)
    .bind(&input.swap_provider)
    .bind(&input.swap_order_id)
    .bind(&input.deposit_address)
    .bind(&input.deposit_chain)
    .bind(&input.deposit_token)
    .bind(input.deposit_amount)
    .bind(input.fee_percent)
    .bind(input.fee_amount)
    .bind(input.net_amount)
    .bind(&input.callback_url)
    .bind(&input.return_url)
    .bind(&input.metadata)
    .bind(&input.description)
    .bind(input.expires_at)
    .bind(now)
    .bind(now)
    .fetch_one(pool)
    .await?;

    Ok(invoice)
}

pub async fn get_invoice_by_id(pool: &PgPool, id: &str) -> Result<Option<Invoice>, sqlx::Error> {
    sqlx::query_as::<_, Invoice>("SELECT * FROM invoices WHERE id = $1")
        .bind(id)
        .fetch_optional(pool)
        .await
}

pub async fn get_invoices_by_merchant(
    pool: &PgPool,
    merchant_id: &str,
    limit: i64,
    offset: i64,
) -> Result<Vec<Invoice>, sqlx::Error> {
    sqlx::query_as::<_, Invoice>(
        "SELECT * FROM invoices WHERE merchant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    )
    .bind(merchant_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await
}

pub async fn update_invoice_status(
    pool: &PgPool,
    id: &str,
    update: UpdateInvoiceStatus,
) -> Result<Option<Invoice>, sqlx::Error> {
    sqlx::query_as::<_, Invoice>(
        r#"
        UPDATE invoices
        SET status = $2,
            tx_hash = COALESCE($3, tx_hash),
            confirmations = COALESCE($4, confirmations),
            paid_at = COALESCE($5, paid_at),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(&update.status)
    .bind(&update.tx_hash)
    .bind(update.confirmations)
    .bind(update.paid_at)
    .fetch_optional(pool)
    .await
}

/// Invoices with swap_pending status — polled by swap_poller worker.
pub async fn get_pending_invoices(pool: &PgPool) -> Result<Vec<Invoice>, sqlx::Error> {
    sqlx::query_as::<_, Invoice>(
        "SELECT * FROM invoices WHERE status = 'swap_pending' ORDER BY created_at ASC",
    )
    .fetch_all(pool)
    .await
}

/// Invoices with confirming status — polled by xmr_watcher worker.
pub async fn get_confirming_invoices(pool: &PgPool) -> Result<Vec<Invoice>, sqlx::Error> {
    sqlx::query_as::<_, Invoice>(
        "SELECT * FROM invoices WHERE status = 'confirming' ORDER BY created_at ASC",
    )
    .fetch_all(pool)
    .await
}

/// Invoices still pending but past their expiry time.
pub async fn get_expired_invoices(pool: &PgPool) -> Result<Vec<Invoice>, sqlx::Error> {
    sqlx::query_as::<_, Invoice>(
        "SELECT * FROM invoices WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < NOW()",
    )
    .fetch_all(pool)
    .await
}

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

pub async fn create_api_key(
    pool: &PgPool,
    merchant_id: &str,
    name: &str,
    key_hash: &str,
    key_prefix: &str,
) -> Result<ApiKey, sqlx::Error> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();

    sqlx::query_as::<_, ApiKey>(
        r#"
        INSERT INTO api_keys (id, merchant_id, name, key_hash, key_prefix, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#,
    )
    .bind(&id)
    .bind(merchant_id)
    .bind(name)
    .bind(key_hash)
    .bind(key_prefix)
    .bind(now)
    .fetch_one(pool)
    .await
}

pub async fn get_api_keys_by_merchant(
    pool: &PgPool,
    merchant_id: &str,
) -> Result<Vec<ApiKey>, sqlx::Error> {
    sqlx::query_as::<_, ApiKey>(
        "SELECT * FROM api_keys WHERE merchant_id = $1 ORDER BY created_at DESC",
    )
    .bind(merchant_id)
    .fetch_all(pool)
    .await
}

pub async fn delete_api_key(
    pool: &PgPool,
    id: &str,
    merchant_id: &str,
) -> Result<bool, sqlx::Error> {
    let result =
        sqlx::query("DELETE FROM api_keys WHERE id = $1 AND merchant_id = $2")
            .bind(id)
            .bind(merchant_id)
            .execute(pool)
            .await?;

    Ok(result.rows_affected() > 0)
}

// ---------------------------------------------------------------------------
// Webhook Logs
// ---------------------------------------------------------------------------

pub async fn create_webhook_log(
    pool: &PgPool,
    merchant_id: &str,
    invoice_id: Option<&str>,
    url: &str,
    payload: &str,
    status_code: i32,
    success: bool,
    attempts: i32,
    next_retry_at: Option<chrono::DateTime<chrono::Utc>>,
) -> Result<WebhookLog, sqlx::Error> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();

    sqlx::query_as::<_, WebhookLog>(
        r#"
        INSERT INTO webhook_logs (id, merchant_id, invoice_id, url, payload, status_code, success, attempts, next_retry_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
        "#,
    )
    .bind(&id)
    .bind(merchant_id)
    .bind(invoice_id)
    .bind(url)
    .bind(payload)
    .bind(status_code)
    .bind(success)
    .bind(attempts)
    .bind(next_retry_at)
    .bind(now)
    .fetch_one(pool)
    .await
}

pub async fn get_webhook_logs_by_merchant(
    pool: &PgPool,
    merchant_id: &str,
    limit: i64,
) -> Result<Vec<WebhookLog>, sqlx::Error> {
    sqlx::query_as::<_, WebhookLog>(
        "SELECT * FROM webhook_logs WHERE merchant_id = $1 ORDER BY created_at DESC LIMIT $2",
    )
    .bind(merchant_id)
    .bind(limit)
    .fetch_all(pool)
    .await
}

/// Failed webhook deliveries due for retry.
pub async fn get_pending_webhook_retries(pool: &PgPool) -> Result<Vec<WebhookLog>, sqlx::Error> {
    sqlx::query_as::<_, WebhookLog>(
        r#"
        SELECT * FROM webhook_logs
        WHERE success = false
          AND next_retry_at IS NOT NULL
          AND next_retry_at <= NOW()
        ORDER BY next_retry_at ASC
        "#,
    )
    .fetch_all(pool)
    .await
}
