pub mod card_order;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// ---------------------------------------------------------------------------
// Merchant
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Merchant {
    pub id: String,
    pub email: String,
    pub hashed_password: String,
    pub webhook_url: Option<String>,
    pub webhook_secret: Option<String>,
    pub xmr_wallet_address: Option<String>,
    pub fee_percent: f64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct NewMerchant {
    pub email: String,
    pub hashed_password: String,
    pub webhook_url: Option<String>,
    pub webhook_secret: Option<String>,
    pub xmr_wallet_address: Option<String>,
    pub fee_percent: Option<f64>,
}

// ---------------------------------------------------------------------------
// Invoice
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Invoice {
    pub id: String,
    pub merchant_id: String,
    pub amount_xmr: f64,
    pub amount_fiat: Option<f64>,
    pub fiat_currency: Option<String>,
    pub subaddress: String,
    pub status: String,

    // Swap details
    pub swap_provider: Option<String>,
    pub swap_order_id: Option<String>,
    pub deposit_address: Option<String>,
    pub deposit_chain: Option<String>,
    pub deposit_token: Option<String>,
    pub deposit_amount: Option<f64>,

    // Transaction
    pub tx_hash: Option<String>,
    pub confirmations: i32,

    // Fee
    pub fee_percent: Option<f64>,
    pub fee_amount: Option<f64>,
    pub net_amount: Option<f64>,

    // Merchant integration
    pub callback_url: Option<String>,
    pub return_url: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub description: Option<String>,

    pub expires_at: Option<DateTime<Utc>>,
    pub paid_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct NewInvoice {
    pub merchant_id: String,
    pub amount_xmr: f64,
    pub amount_fiat: Option<f64>,
    pub fiat_currency: Option<String>,
    pub subaddress: String,
    pub status: Option<String>,

    pub swap_provider: Option<String>,
    pub swap_order_id: Option<String>,
    pub deposit_address: Option<String>,
    pub deposit_chain: Option<String>,
    pub deposit_token: Option<String>,
    pub deposit_amount: Option<f64>,

    pub fee_percent: Option<f64>,
    pub fee_amount: Option<f64>,
    pub net_amount: Option<f64>,

    pub callback_url: Option<String>,
    pub return_url: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub description: Option<String>,

    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInvoiceStatus {
    pub status: String,
    pub tx_hash: Option<String>,
    pub confirmations: Option<i32>,
    pub paid_at: Option<DateTime<Utc>>,
}

// ---------------------------------------------------------------------------
// ApiKey
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ApiKey {
    pub id: String,
    pub merchant_id: String,
    pub name: String,
    pub key_hash: String,
    pub key_prefix: String,
    pub expires_at: Option<DateTime<Utc>>,
    pub last_used: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// WebhookLog
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WebhookLog {
    pub id: String,
    pub merchant_id: String,
    pub invoice_id: Option<String>,
    pub url: String,
    pub payload: String,
    pub status_code: i32,
    pub success: bool,
    pub attempts: i32,
    pub next_retry_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}
