use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
    Json,
};
use sha2::{Digest, Sha256};
use std::sync::Arc;

use crate::models::Merchant;

use super::AppState;

/// Extract the merchant from the request extensions.
///
/// Use this in handlers that require authentication:
/// ```ignore
/// async fn handler(merchant: AuthMerchant, ...) { ... }
/// ```
#[derive(Debug, Clone)]
pub struct AuthMerchant(pub Merchant);

impl<S> axum::extract::FromRequestParts<S> for AuthMerchant
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, Json<serde_json::Value>);

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<Merchant>()
            .cloned()
            .map(AuthMerchant)
            .ok_or_else(|| {
                (
                    StatusCode::UNAUTHORIZED,
                    Json(serde_json::json!({
                        "error": "missing or invalid API key",
                        "code": "unauthorized"
                    })),
                )
            })
    }
}

/// Axum middleware that authenticates requests via the `X-API-Key` header.
///
/// Flow:
/// 1. Extract header value (expect `sk_live_...` or `sk_test_...`).
/// 2. SHA-256 hash the raw key.
/// 3. Look up the hash in the `api_keys` table.
/// 4. If found, load the corresponding merchant and inject into request extensions.
/// 5. If not found, return 401.
pub async fn auth_middleware(
    State(state): State<Arc<AppState>>,
    mut req: Request,
    next: Next,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    let api_key = req
        .headers()
        .get("X-API-Key")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let api_key = match api_key {
        Some(k) if !k.is_empty() => k,
        _ => {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "missing X-API-Key header",
                    "code": "unauthorized"
                })),
            ));
        }
    };

    // Hash the key with SHA-256.
    let mut hasher = Sha256::new();
    hasher.update(api_key.as_bytes());
    let key_hash = hex::encode(hasher.finalize());

    // Look up the API key in the database.
    let api_key_row = sqlx::query_as::<_, crate::models::ApiKey>(
        "SELECT * FROM api_keys WHERE key_hash = $1 AND (expires_at IS NULL OR expires_at > NOW())",
    )
    .bind(&key_hash)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "failed to query api_keys");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "internal error",
                "code": "internal_error"
            })),
        )
    })?;

    let api_key_row = match api_key_row {
        Some(k) => k,
        None => {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "invalid API key",
                    "code": "unauthorized"
                })),
            ));
        }
    };

    // Update last_used timestamp (fire and forget).
    let pool = state.pool.clone();
    let key_id = api_key_row.id.clone();
    tokio::spawn(async move {
        let _ = sqlx::query("UPDATE api_keys SET last_used = NOW() WHERE id = $1")
            .bind(&key_id)
            .execute(&pool)
            .await;
    });

    // Load the merchant.
    let merchant = sqlx::query_as::<_, Merchant>("SELECT * FROM merchants WHERE id = $1")
        .bind(&api_key_row.merchant_id)
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "failed to query merchants");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "internal error",
                    "code": "internal_error"
                })),
            )
        })?;

    let merchant = match merchant {
        Some(m) => m,
        None => {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "merchant not found for API key",
                    "code": "unauthorized"
                })),
            ));
        }
    };

    // Inject merchant into request extensions.
    req.extensions_mut().insert(merchant);

    Ok(next.run(req).await)
}
