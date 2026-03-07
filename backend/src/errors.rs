/// Errors returned by the Monero wallet-rpc client.
#[derive(Debug, thiserror::Error)]
pub enum MoneroError {
    /// The RPC server returned a JSON-RPC error.
    #[error("monero rpc error (code {code}): {message}")]
    RpcError { code: i64, message: String },

    /// HTTP or network-level failure when contacting the RPC server.
    #[error("monero network error: {0}")]
    NetworkError(#[from] reqwest::Error),

    /// The address supplied to validate_address was rejected by the node.
    #[error("invalid monero address: {0}")]
    InvalidAddress(String),

    /// The request to monero-wallet-rpc timed out.
    #[error("monero rpc request timed out")]
    Timeout,

    /// Failed to deserialize the RPC response.
    #[error("monero rpc deserialization error: {0}")]
    DeserializationError(String),

    /// The RPC response was missing an expected field.
    #[error("monero rpc missing field: {0}")]
    MissingField(String),

    /// Catch-all for unexpected situations.
    #[error("monero client error: {0}")]
    Other(String),
}

/// Convenience alias used throughout the Monero client.
pub type MoneroResult<T> = Result<T, MoneroError>;

// ---------------------------------------------------------------------------
// Wagyu errors
// ---------------------------------------------------------------------------

/// Errors returned by the Wagyu swap API client.
#[derive(Debug, thiserror::Error)]
pub enum WagyuError {
    /// The Wagyu API returned an HTTP error with a status code and message.
    #[error("wagyu api error (HTTP {status}): {message}")]
    ApiError { status: u16, message: String },

    /// HTTP or network-level failure when contacting the Wagyu API.
    #[error("wagyu network error: {0}")]
    NetworkError(reqwest::Error),

    /// The API returned a success status but the body could not be deserialized.
    #[error("wagyu invalid response: {0}")]
    InvalidResponse(String),

    /// The swap order reached a terminal failure state.
    #[error("wagyu order failed: {0}")]
    OrderFailed(String),

    /// Catch-all for configuration or unexpected issues.
    #[error("wagyu client error: {0}")]
    Other(String),
}

impl WagyuError {
    /// Whether this error is transient and the request should be retried.
    pub fn is_retryable(&self) -> bool {
        match self {
            Self::NetworkError(e) => {
                // Retry on timeouts and connection errors, not on builder errors.
                e.is_timeout() || e.is_connect() || e.is_request()
            }
            Self::ApiError { status, .. } => {
                // Retry on 429 (rate limit) and 5xx server errors.
                *status == 429 || *status >= 500
            }
            _ => false,
        }
    }
}

/// Convenience alias used throughout the Wagyu client.
pub type WagyuResult<T> = Result<T, WagyuError>;

// ---------------------------------------------------------------------------
// Trocador errors
// ---------------------------------------------------------------------------

/// Errors returned by the Trocador API client.
#[derive(Debug, thiserror::Error)]
pub enum TrocadorError {
    /// The Trocador API returned an error message or non-2xx status.
    #[error("trocador api error: {0}")]
    ApiError(String),

    /// HTTP or network-level failure when contacting the Trocador API.
    #[error("trocador network error: {0}")]
    NetworkError(#[from] reqwest::Error),

    /// The response could not be deserialized into the expected type.
    #[error("trocador invalid response: {0}")]
    InvalidResponse(String),

    /// A trade-level error (e.g. trade failed, halted, or refunded).
    #[error("trocador trade error: {0}")]
    TradeError(String),
}

/// Convenience alias used throughout the Trocador client.
pub type TrocadorResult<T> = Result<T, TrocadorError>;
