use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

use crate::errors::{MoneroError, TrocadorError, WagyuError};

// ---------------------------------------------------------------------------
// AppError — unified API error type
// ---------------------------------------------------------------------------

#[derive(Debug)]
pub enum AppError {
    /// 400 — malformed request, missing fields, bad input.
    BadRequest(String),
    /// 401 — missing or invalid API key.
    Unauthorized(String),
    /// 404 — resource not found.
    NotFound(String),
    /// 422 — validation failed (semantic, not syntactic).
    Validation(String),
    /// 500 — unexpected internal error.
    Internal(String),
}

impl AppError {
    fn status_code(&self) -> StatusCode {
        match self {
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            Self::NotFound(_) => StatusCode::NOT_FOUND,
            Self::Validation(_) => StatusCode::UNPROCESSABLE_ENTITY,
            Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_code(&self) -> &'static str {
        match self {
            Self::BadRequest(_) => "bad_request",
            Self::Unauthorized(_) => "unauthorized",
            Self::NotFound(_) => "not_found",
            Self::Validation(_) => "validation_error",
            Self::Internal(_) => "internal_error",
        }
    }

    fn message(&self) -> &str {
        match self {
            Self::BadRequest(m)
            | Self::Unauthorized(m)
            | Self::NotFound(m)
            | Self::Validation(m)
            | Self::Internal(m) => m,
        }
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.error_code(), self.message())
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let body = json!({
            "error": self.message(),
            "code": self.error_code(),
        });

        // Log internal errors at error level, others at debug.
        match &self {
            AppError::Internal(msg) => tracing::error!(%msg, "internal server error"),
            other => tracing::debug!(error = %other, "api error response"),
        }

        (status, Json(body)).into_response()
    }
}

// ---------------------------------------------------------------------------
// From impls — convert domain errors into AppError
// ---------------------------------------------------------------------------

impl From<MoneroError> for AppError {
    fn from(e: MoneroError) -> Self {
        tracing::error!(error = %e, "monero client error");
        Self::Internal(format!("monero error: {e}"))
    }
}

impl From<WagyuError> for AppError {
    fn from(e: WagyuError) -> Self {
        tracing::error!(error = %e, "wagyu client error");
        Self::Internal(format!("swap error: {e}"))
    }
}

impl From<TrocadorError> for AppError {
    fn from(e: TrocadorError) -> Self {
        tracing::error!(error = %e, "trocador client error");
        Self::Internal(format!("swap error: {e}"))
    }
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        match &e {
            sqlx::Error::RowNotFound => Self::NotFound("resource not found".into()),
            sqlx::Error::Database(db_err) => {
                // Unique constraint violation → 409-ish, but we map to BadRequest.
                if db_err.code().as_deref() == Some("23505") {
                    Self::BadRequest("resource already exists".into())
                } else {
                    tracing::error!(error = %e, "database error");
                    Self::Internal("database error".into())
                }
            }
            _ => {
                tracing::error!(error = %e, "database error");
                Self::Internal("database error".into())
            }
        }
    }
}
