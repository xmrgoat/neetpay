use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CardOrder {
    pub id: String,
    pub merchant_id: String,
    pub order_type: String,
    pub trocador_trade_id: String,
    pub provider: String,
    pub currency_code: String,
    pub amount_fiat: f64,
    pub ticker_from: String,
    pub network_from: String,
    pub deposit_address: String,
    pub deposit_amount: String,
    pub email: String,
    pub status: String,
    pub card_details: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct NewCardOrder {
    pub merchant_id: String,
    pub order_type: String,
    pub trocador_trade_id: String,
    pub provider: String,
    pub currency_code: String,
    pub amount_fiat: f64,
    pub ticker_from: String,
    pub network_from: String,
    pub deposit_address: String,
    pub deposit_amount: String,
    pub email: String,
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

pub async fn create(pool: &sqlx::PgPool, input: NewCardOrder) -> Result<CardOrder, sqlx::Error> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    sqlx::query_as::<_, CardOrder>(
        r#"
        INSERT INTO card_orders (id, merchant_id, order_type, trocador_trade_id, provider, currency_code, amount_fiat, ticker_from, network_from, deposit_address, deposit_amount, email, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13)
        RETURNING *
        "#,
    )
    .bind(&id)
    .bind(&input.merchant_id)
    .bind(&input.order_type)
    .bind(&input.trocador_trade_id)
    .bind(&input.provider)
    .bind(&input.currency_code)
    .bind(input.amount_fiat)
    .bind(&input.ticker_from)
    .bind(&input.network_from)
    .bind(&input.deposit_address)
    .bind(&input.deposit_amount)
    .bind(&input.email)
    .bind(now)
    .fetch_one(pool)
    .await
}

pub async fn find_by_id(pool: &sqlx::PgPool, id: &str) -> Result<Option<CardOrder>, sqlx::Error> {
    sqlx::query_as::<_, CardOrder>("SELECT * FROM card_orders WHERE id = $1")
        .bind(id)
        .fetch_optional(pool)
        .await
}

pub async fn find_by_merchant(
    pool: &sqlx::PgPool,
    merchant_id: &str,
) -> Result<Vec<CardOrder>, sqlx::Error> {
    sqlx::query_as::<_, CardOrder>(
        "SELECT * FROM card_orders WHERE merchant_id = $1 ORDER BY created_at DESC",
    )
    .bind(merchant_id)
    .fetch_all(pool)
    .await
}

pub async fn update_status(
    pool: &sqlx::PgPool,
    id: &str,
    status: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE card_orders SET status = $2 WHERE id = $1")
        .bind(id)
        .bind(status)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn update_card_details(
    pool: &sqlx::PgPool,
    id: &str,
    details: serde_json::Value,
) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE card_orders SET card_details = $2 WHERE id = $1")
        .bind(id)
        .bind(details)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn clear_email(pool: &sqlx::PgPool, id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE card_orders SET email = '' WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn find_pending(pool: &sqlx::PgPool) -> Result<Vec<CardOrder>, sqlx::Error> {
    sqlx::query_as::<_, CardOrder>(
        "SELECT * FROM card_orders WHERE status = 'pending' ORDER BY created_at ASC",
    )
    .fetch_all(pool)
    .await
}
