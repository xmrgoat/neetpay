use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
    Json,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use sha2::{Digest, Sha256};
use std::sync::Arc;

use crate::models::Merchant;
use super::AppState;

/// JWT claims for dashboard sessions.
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Claims {
    pub merchant_id: String,
    pub email: String,
    pub exp: usize,
    pub iat: usize,
}

/// Extract the merchant from request extensions (set by JWT middleware).
/// Use in handlers: `async fn handler(merchant: JwtMerchant, ...) { ... }`
#[derive(Debug, Clone)]
pub struct JwtMerchant(pub Merchant);

impl<S> axum::extract::FromRequestParts<S> for JwtMerchant
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
            .get::<JwtMerchantMarker>()
            .map(|m| JwtMerchant(m.0.clone()))
            .ok_or_else(|| {
                (
                    StatusCode::UNAUTHORIZED,
                    Json(serde_json::json!({
                        "error": "authentication required",
                        "code": "unauthorized"
                    })),
                )
            })
    }
}

/// Internal marker to distinguish JWT-authed merchants from API-key-authed ones.
#[derive(Debug, Clone)]
struct JwtMerchantMarker(Merchant);

/// Axum middleware that authenticates requests via `Authorization: Bearer <jwt>`.
///
/// 1. Extract JWT from Authorization header.
/// 2. Verify signature + expiry with JWT_SECRET.
/// 3. Check session exists in auth_sessions (not logged out).
/// 4. Load merchant and inject into request extensions.
pub async fn jwt_auth_middleware(
    State(state): State<Arc<AppState>>,
    mut req: Request,
    next: Next,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    let token = req
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(|s| s.to_string());

    let token = match token {
        Some(t) if !t.is_empty() => t,
        _ => {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "missing Authorization header",
                    "code": "unauthorized"
                })),
            ));
        }
    };

    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_default();
    if jwt_secret.len() < 32 {
        tracing::error!("JWT_SECRET is not set or too short");
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "internal error",
                "code": "internal_error"
            })),
        ));
    }

    // Decode and verify JWT.
    let claims = decode::<Claims>(
        &token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| {
        tracing::debug!(error = %e, "invalid JWT");
        (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "error": "invalid or expired token",
                "code": "unauthorized"
            })),
        )
    })?
    .claims;

    // Verify session exists in DB (allows server-side invalidation).
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    let token_hash = hex::encode(hasher.finalize());

    let session_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM auth_sessions WHERE token_hash = $1 AND expires_at > NOW())",
    )
    .bind(&token_hash)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!(error = %e, "failed to query auth_sessions");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "internal error",
                "code": "internal_error"
            })),
        )
    })?;

    if !session_exists {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "error": "session expired or invalidated",
                "code": "unauthorized"
            })),
        ));
    }

    // Load merchant.
    let merchant = sqlx::query_as::<_, Merchant>("SELECT * FROM merchants WHERE id = $1")
        .bind(&claims.merchant_id)
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
                    "error": "merchant not found",
                    "code": "unauthorized"
                })),
            ));
        }
    };

    req.extensions_mut().insert(JwtMerchantMarker(merchant));

    Ok(next.run(req).await)
}
