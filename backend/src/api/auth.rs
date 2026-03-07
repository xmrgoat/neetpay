use axum::{
    extract::{Query, State},
    Json,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, EncodingKey, Header};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::Arc;

use super::error::AppError;
use super::jwt_auth::{Claims, JwtMerchant};
use super::AppState;

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct RequestMagicLinkBody {
    pub email: String,
}

#[derive(Debug, Serialize)]
pub struct RequestMagicLinkResponse {
    pub message: String,
    /// 8-char code the frontend uses to poll for cross-device auth.
    pub session_code: String,
}

#[derive(Debug, Deserialize)]
pub struct VerifyQuery {
    pub token: String,
    pub email: String,
}

#[derive(Debug, Serialize)]
pub struct VerifyResponse {
    pub token: String,
    pub merchant_id: String,
    pub is_new: bool,
}

#[derive(Debug, Deserialize)]
pub struct PollQuery {
    pub session_code: String,
}

#[derive(Debug, Serialize)]
pub struct PollResponse {
    /// "pending" | "authenticated"
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub merchant_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_new: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct MeResponse {
    pub id: String,
    pub email: String,
    pub webhook_url: Option<String>,
    pub xmr_wallet_address: Option<String>,
    pub fee_percent: f64,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct LogoutResponse {
    pub success: bool,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Generate a short alphanumeric session code (8 chars).
fn generate_session_code() -> String {
    const CHARSET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let mut rng = rand::thread_rng();
    (0..8)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}

/// Create a JWT + session for a merchant. Returns (jwt, merchant_id, is_new).
async fn create_jwt_session(
    state: &Arc<AppState>,
    email: &str,
) -> Result<(String, String, bool), AppError> {
    // Find or create merchant.
    let (merchant_id, is_new) = match sqlx::query_scalar::<_, String>(
        "SELECT id FROM merchants WHERE LOWER(email) = $1",
    )
    .bind(email)
    .fetch_optional(&state.pool)
    .await?
    {
        Some(id) => (id, false),
        None => {
            let new_id = uuid::Uuid::new_v4().to_string();
            let now = Utc::now();
            let placeholder_pw = "magic_link_auth_no_password";

            sqlx::query(
                r#"INSERT INTO merchants (id, email, hashed_password, fee_percent, created_at, updated_at)
                   VALUES ($1, $2, $3, 0.4, $4, $5)"#,
            )
            .bind(&new_id)
            .bind(email)
            .bind(placeholder_pw)
            .bind(now)
            .bind(now)
            .execute(&state.pool)
            .await?;

            // Generate default API key.
            let raw_key = format!(
                "sk_live_{}",
                uuid::Uuid::new_v4().to_string().replace('-', "")
            );
            let key_prefix = &raw_key[..12];
            let mut key_hasher = Sha256::new();
            key_hasher.update(raw_key.as_bytes());
            let key_hash = hex::encode(key_hasher.finalize());

            sqlx::query(
                "INSERT INTO api_keys (id, merchant_id, name, key_hash, key_prefix) VALUES ($1, $2, $3, $4, $5)",
            )
            .bind(uuid::Uuid::new_v4().to_string())
            .bind(&new_id)
            .bind("Default")
            .bind(&key_hash)
            .bind(key_prefix)
            .execute(&state.pool)
            .await?;

            // Send welcome email.
            let resend = state.resend.clone();
            let welcome_email = email.to_string();
            let dashboard = format!(
                "{}/dashboard",
                std::env::var("APP_URL").unwrap_or_else(|_| "https://neetpay.com".into())
            );
            tokio::spawn(async move {
                if let Err(e) = resend.send_welcome(&welcome_email, &dashboard).await {
                    tracing::error!(error = %e, "failed to send welcome email");
                }
            });

            (new_id, true)
        }
    };

    // Generate JWT.
    let jwt_secret = std::env::var("JWT_SECRET").map_err(|_| {
        AppError::Internal("JWT_SECRET not configured".into())
    })?;

    let expiry_days: i64 = std::env::var("JWT_EXPIRY_DAYS")
        .unwrap_or_else(|_| "30".into())
        .parse()
        .unwrap_or(30);

    let now = Utc::now();
    let exp = now + Duration::days(expiry_days);

    let claims = Claims {
        merchant_id: merchant_id.clone(),
        email: email.to_string(),
        exp: exp.timestamp() as usize,
        iat: now.timestamp() as usize,
    };

    let jwt = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("failed to encode JWT: {e}")))?;

    // Store session.
    let mut session_hasher = Sha256::new();
    session_hasher.update(jwt.as_bytes());
    let session_hash = hex::encode(session_hasher.finalize());

    sqlx::query(
        "INSERT INTO auth_sessions (id, merchant_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(&merchant_id)
    .bind(&session_hash)
    .bind(exp)
    .execute(&state.pool)
    .await?;

    Ok((jwt, merchant_id, is_new))
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// POST /v1/auth/request — send a magic link to the given email.
pub async fn request_magic_link(
    State(state): State<Arc<AppState>>,
    Json(body): Json<RequestMagicLinkBody>,
) -> Result<Json<RequestMagicLinkResponse>, AppError> {
    let email = body.email.trim().to_lowercase();

    // Basic email validation.
    if email.is_empty() || !email.contains('@') || !email.contains('.') {
        return Err(AppError::Validation("invalid email address".into()));
    }

    // Generate session code for cross-device polling.
    let session_code = generate_session_code();

    // Rate limiting: max 3 magic links per email per hour.
    let recent_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM magic_links WHERE email = $1 AND created_at > NOW() - INTERVAL '1 hour'",
    )
    .bind(&email)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    if recent_count >= 3 {
        return Ok(Json(RequestMagicLinkResponse {
            message: "Check your inbox".to_string(),
            session_code,
        }));
    }

    // Generate 32-byte random token.
    let mut token_bytes = [0u8; 32];
    rand::thread_rng().fill(&mut token_bytes);
    let raw_token = hex::encode(token_bytes);

    // Hash for storage.
    let mut hasher = Sha256::new();
    hasher.update(raw_token.as_bytes());
    let token_hash = hex::encode(hasher.finalize());

    let expiry_minutes: i64 = std::env::var("MAGIC_LINK_EXPIRY_MINUTES")
        .unwrap_or_else(|_| "15".into())
        .parse()
        .unwrap_or(15);

    let expires_at = Utc::now() + Duration::minutes(expiry_minutes);

    // Store magic link with session code.
    sqlx::query(
        "INSERT INTO magic_links (id, email, token_hash, expires_at, session_code) VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(&email)
    .bind(&token_hash)
    .bind(expires_at)
    .bind(&session_code)
    .execute(&state.pool)
    .await?;

    // Build magic URL and send email.
    let app_url = std::env::var("APP_URL").unwrap_or_else(|_| "https://neetpay.com".into());
    let magic_url = format!(
        "{}/verify?token={}&email={}",
        app_url, raw_token, email
    );

    let resend = state.resend.clone();
    let email_clone = email.clone();
    tokio::spawn(async move {
        if let Err(e) = resend.send_magic_link(&email_clone, &magic_url).await {
            tracing::error!(error = %e, email = %email_clone, "failed to send magic link email");
        }
    });

    Ok(Json(RequestMagicLinkResponse {
        message: "Check your inbox".to_string(),
        session_code,
    }))
}

/// GET /v1/auth/verify?token=xxx&email=xxx — verify a magic link token.
///
/// When clicked (on any device), this verifies the token, creates the JWT,
/// and stores it on the magic_link row so the polling endpoint can pick it up.
pub async fn verify_magic_link(
    State(state): State<Arc<AppState>>,
    Query(params): Query<VerifyQuery>,
) -> Result<Json<VerifyResponse>, AppError> {
    let email = params.email.trim().to_lowercase();

    // Hash the received token.
    let mut hasher = Sha256::new();
    hasher.update(params.token.as_bytes());
    let token_hash = hex::encode(hasher.finalize());

    // Look up valid, unused magic link.
    let magic_link = sqlx::query_as::<_, MagicLinkRow>(
        "SELECT id, email FROM magic_links WHERE token_hash = $1 AND used = FALSE AND expires_at > NOW()",
    )
    .bind(&token_hash)
    .fetch_optional(&state.pool)
    .await?;

    let magic_link = match magic_link {
        Some(ml) => ml,
        None => return Err(AppError::Unauthorized("invalid or expired link".into())),
    };

    if magic_link.email.to_lowercase() != email {
        return Err(AppError::Unauthorized("invalid or expired link".into()));
    }

    // Create JWT + session.
    let (jwt, merchant_id, is_new) = create_jwt_session(&state, &email).await?;

    // Mark as used AND store JWT result for cross-device polling.
    sqlx::query(
        "UPDATE magic_links SET used = TRUE, jwt_result = $2, merchant_id_result = $3, is_new_result = $4 WHERE id = $1",
    )
    .bind(&magic_link.id)
    .bind(&jwt)
    .bind(&merchant_id)
    .bind(is_new)
    .execute(&state.pool)
    .await?;

    Ok(Json(VerifyResponse {
        token: jwt,
        merchant_id,
        is_new,
    }))
}

/// GET /v1/auth/poll?session_code=xxx — poll for cross-device authentication.
///
/// The PC frontend calls this every 2s after requesting a magic link.
/// When the user clicks the link on their phone, the JWT gets stored on the
/// magic_link row and this endpoint returns it.
pub async fn poll_magic_link(
    State(state): State<Arc<AppState>>,
    Query(params): Query<PollQuery>,
) -> Result<Json<PollResponse>, AppError> {
    let code = params.session_code.trim().to_uppercase();

    if code.is_empty() || code.len() != 8 {
        return Err(AppError::Validation("invalid session code".into()));
    }

    // Check if the magic link with this session code has been verified.
    let row = sqlx::query_as::<_, PollRow>(
        "SELECT jwt_result, merchant_id_result, is_new_result FROM magic_links WHERE session_code = $1 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
    )
    .bind(&code)
    .fetch_optional(&state.pool)
    .await?;

    match row {
        Some(r) if r.jwt_result.is_some() => {
            // Authenticated! Clear the JWT from the row (one-time read).
            sqlx::query("UPDATE magic_links SET jwt_result = NULL WHERE session_code = $1")
                .bind(&code)
                .execute(&state.pool)
                .await
                .ok();

            Ok(Json(PollResponse {
                status: "authenticated".to_string(),
                token: r.jwt_result,
                merchant_id: r.merchant_id_result,
                is_new: r.is_new_result,
            }))
        }
        _ => Ok(Json(PollResponse {
            status: "pending".to_string(),
            token: None,
            merchant_id: None,
            is_new: None,
        })),
    }
}

/// POST /v1/auth/logout — invalidate the current session.
pub async fn logout(
    State(state): State<Arc<AppState>>,
    JwtMerchant(_merchant): JwtMerchant,
    req: axum::extract::Request,
) -> Result<Json<LogoutResponse>, AppError> {
    let token = req
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .unwrap_or_default();

    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    let token_hash = hex::encode(hasher.finalize());

    sqlx::query("DELETE FROM auth_sessions WHERE token_hash = $1")
        .bind(&token_hash)
        .execute(&state.pool)
        .await?;

    Ok(Json(LogoutResponse { success: true }))
}

/// GET /v1/auth/me — get the authenticated merchant's info.
pub async fn me(
    JwtMerchant(merchant): JwtMerchant,
) -> Result<Json<MeResponse>, AppError> {
    Ok(Json(MeResponse {
        id: merchant.id,
        email: merchant.email,
        webhook_url: merchant.webhook_url,
        xmr_wallet_address: merchant.xmr_wallet_address,
        fee_percent: merchant.fee_percent,
        created_at: merchant.created_at.to_rfc3339(),
    }))
}

// ---------------------------------------------------------------------------
// Helper models
// ---------------------------------------------------------------------------

#[derive(Debug, sqlx::FromRow)]
struct MagicLinkRow {
    id: String,
    email: String,
}

#[derive(Debug, sqlx::FromRow)]
struct PollRow {
    jwt_result: Option<String>,
    merchant_id_result: Option<String>,
    is_new_result: Option<bool>,
}
