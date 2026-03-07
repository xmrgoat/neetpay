use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::Arc;

use super::error::AppError;
use super::middleware::AuthMerchant;
use super::AppState;

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct CreateMerchantRequest {
    pub email: String,
    pub password: String,
    pub xmr_wallet_address: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CreateMerchantResponse {
    pub id: String,
    pub email: String,
    pub api_key: String,
}

#[derive(Debug, Serialize)]
pub struct MerchantResponse {
    pub id: String,
    pub email: String,
    pub webhook_url: Option<String>,
    pub xmr_wallet_address: Option<String>,
    pub fee_percent: f64,
    pub created_at: String,
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// POST /v1/merchants — create a new merchant account.
pub async fn create_merchant(
    State(state): State<Arc<AppState>>,
    Json(body): Json<CreateMerchantRequest>,
) -> Result<Json<CreateMerchantResponse>, AppError> {
    // Validate email.
    if body.email.is_empty() || !body.email.contains('@') {
        return Err(AppError::Validation("invalid email address".into()));
    }

    // Validate password.
    if body.password.len() < 8 {
        return Err(AppError::Validation(
            "password must be at least 8 characters".into(),
        ));
    }

    let merchant_id = uuid::Uuid::new_v4().to_string();

    // Hash password with SHA-256 (sha2 crate — no bcrypt in deps).
    let mut pw_hasher = Sha256::new();
    pw_hasher.update(body.password.as_bytes());
    let hashed_password = hex::encode(pw_hasher.finalize());

    // Insert merchant.
    sqlx::query(
        r#"
        INSERT INTO merchants (id, email, hashed_password, xmr_wallet_address)
        VALUES ($1, $2, $3, $4)
        "#,
    )
    .bind(&merchant_id)
    .bind(&body.email)
    .bind(&hashed_password)
    .bind(&body.xmr_wallet_address)
    .execute(&state.pool)
    .await?;

    // Generate API key: sk_live_<random>
    let raw_key = format!("sk_live_{}", uuid::Uuid::new_v4().to_string().replace('-', ""));
    let key_prefix = &raw_key[..12]; // "sk_live_XXXX"

    let mut key_hasher = Sha256::new();
    key_hasher.update(raw_key.as_bytes());
    let key_hash = hex::encode(key_hasher.finalize());

    let key_id = uuid::Uuid::new_v4().to_string();

    sqlx::query(
        r#"
        INSERT INTO api_keys (id, merchant_id, name, key_hash, key_prefix)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(&key_id)
    .bind(&merchant_id)
    .bind("Default")
    .bind(&key_hash)
    .bind(key_prefix)
    .execute(&state.pool)
    .await?;

    Ok(Json(CreateMerchantResponse {
        id: merchant_id,
        email: body.email,
        api_key: raw_key,
    }))
}

/// GET /v1/merchants/me — get the authenticated merchant's info.
pub async fn get_me(
    AuthMerchant(merchant): AuthMerchant,
) -> Result<Json<MerchantResponse>, AppError> {
    Ok(Json(MerchantResponse {
        id: merchant.id,
        email: merchant.email,
        webhook_url: merchant.webhook_url,
        xmr_wallet_address: merchant.xmr_wallet_address,
        fee_percent: merchant.fee_percent,
        created_at: merchant.created_at.to_rfc3339(),
    }))
}
