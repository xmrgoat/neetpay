//! Wagyu swap API client.
//!
//! Handles quoting, order creation, and order polling for cross-chain → XMR swaps
//! via the Wagyu exchange API.

use std::time::Duration;

use reqwest::header::{HeaderMap, HeaderValue};
use serde::{Deserialize, Serialize};
use tracing::{debug, warn};

use crate::errors::{WagyuError, WagyuResult};

// ---------------------------------------------------------------------------
// Chain ID constants
// ---------------------------------------------------------------------------

pub const CHAIN_ARBITRUM: u64 = 42161;
pub const CHAIN_SOLANA: u64 = 1151111081099710;
pub const CHAIN_BITCOIN: u64 = 20000000000001;
pub const CHAIN_MONERO: u64 = 0;

// ---------------------------------------------------------------------------
// Token address constants – Arbitrum
// ---------------------------------------------------------------------------

pub const USDC_ARBITRUM: &str = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
pub const USDT_ARBITRUM: &str = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
pub const ETH_ARBITRUM: &str = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
pub const WBTC_ARBITRUM: &str = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

// Native tokens on their respective chains.
pub const XMR_NATIVE: &str = "XMR";
pub const BTC_NATIVE: &str = "BTC";
pub const SOL_NATIVE: &str = "SOL";

// ---------------------------------------------------------------------------
// Retry settings
// ---------------------------------------------------------------------------

const MAX_RETRIES: u32 = 3;
const INITIAL_BACKOFF_MS: u64 = 500;

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

/// Body for `POST /v1/quote`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuoteRequest {
    pub from_chain_id: u64,
    pub to_chain_id: u64,
    pub from_token: String,
    pub to_token: String,
    /// Source amount as a decimal string (e.g. "100.0").
    pub from_amount: String,
}

/// Successful response from `POST /v1/quote`.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuoteResponse {
    pub from_amount: String,
    pub to_amount: String,
    pub rate: String,
    pub integrator_fee: String,
    pub network_fee: String,
}

/// Body for `POST /v1/order`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderRequest {
    pub from_chain_id: u64,
    pub to_chain_id: u64,
    pub from_token: String,
    pub to_token: String,
    pub from_amount: String,
    /// Destination address where swapped funds are sent (XMR subaddress).
    pub to_address: String,
    /// NeetPay integrator fee as a percentage string (e.g. "0.4").
    #[serde(skip_serializing_if = "Option::is_none")]
    pub integrator_fee_percent: Option<String>,
    /// Address that receives the integrator fee.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub integrator_fee_address: Option<String>,
}

/// Successful response from `POST /v1/order`.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderResponse {
    pub order_id: String,
    pub deposit_address: String,
    pub deposit_amount: String,
    pub status: OrderStatus,
}

/// Full order details returned by `GET /v1/order/:id`.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderDetails {
    pub order_id: String,
    pub deposit_address: String,
    pub deposit_amount: String,
    pub status: OrderStatus,
    /// The destination amount the user will receive (may differ from quote).
    #[serde(default)]
    pub to_amount: Option<String>,
    /// Transaction hash on the destination chain, populated once completed.
    #[serde(default)]
    pub tx_hash: Option<String>,
}

/// Wagyu order lifecycle states.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OrderStatus {
    AwaitingDeposit,
    DepositDetected,
    DepositConfirmed,
    ExecutingSwap,
    Completed,
    Refunding,
    Refunded,
    Failed,
    Expired,
}

impl std::fmt::Display for OrderStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::AwaitingDeposit => "awaiting_deposit",
            Self::DepositDetected => "deposit_detected",
            Self::DepositConfirmed => "deposit_confirmed",
            Self::ExecutingSwap => "executing_swap",
            Self::Completed => "completed",
            Self::Refunding => "refunding",
            Self::Refunded => "refunded",
            Self::Failed => "failed",
            Self::Expired => "expired",
        };
        f.write_str(s)
    }
}

// ---------------------------------------------------------------------------
// Wagyu API error body
// ---------------------------------------------------------------------------

/// Shape of a JSON error body returned by the Wagyu API.
#[derive(Debug, Deserialize)]
struct ApiErrorBody {
    #[serde(default)]
    message: Option<String>,
    #[serde(default)]
    error: Option<String>,
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/// Async HTTP client for the Wagyu swap API.
#[derive(Debug, Clone)]
pub struct WagyuClient {
    base_url: String,
    api_key: String,
    http: reqwest::Client,
}

impl WagyuClient {
    /// Create a new client.
    ///
    /// Reads `WAGYU_API_URL` (default `https://api.wagyu.xyz`) and
    /// `WAGYU_API_KEY` from the environment if the caller does not supply
    /// explicit values.
    pub fn new(base_url: Option<String>, api_key: Option<String>) -> WagyuResult<Self> {
        let base_url = base_url
            .or_else(|| std::env::var("WAGYU_API_URL").ok())
            .unwrap_or_else(|| "https://api.wagyu.xyz".to_string())
            .trim_end_matches('/')
            .to_string();

        let api_key = api_key
            .or_else(|| std::env::var("WAGYU_API_KEY").ok())
            .ok_or_else(|| {
                WagyuError::Other("WAGYU_API_KEY not set and no api_key provided".into())
            })?;

        let mut default_headers = HeaderMap::new();
        default_headers.insert(
            "X-API-KEY",
            HeaderValue::from_str(&api_key).map_err(|e| {
                WagyuError::Other(format!("invalid api key header value: {e}"))
            })?,
        );

        let http = reqwest::Client::builder()
            .default_headers(default_headers)
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(WagyuError::NetworkError)?;

        Ok(Self {
            base_url,
            api_key,
            http,
        })
    }

    // -- public API ---------------------------------------------------------

    /// Request a quote for a cross-chain swap.
    pub async fn quote(&self, req: &QuoteRequest) -> WagyuResult<QuoteResponse> {
        let url = format!("{}/v1/quote", self.base_url);
        self.post_with_retry(&url, req).await
    }

    /// Create a new swap order. Returns deposit details the payer must fund.
    pub async fn create_order(&self, req: &OrderRequest) -> WagyuResult<OrderResponse> {
        let url = format!("{}/v1/order", self.base_url);
        self.post_with_retry(&url, req).await
    }

    /// Poll the current status of an existing order.
    pub async fn get_order(&self, order_id: &str) -> WagyuResult<OrderDetails> {
        let url = format!("{}/v1/order/{}", self.base_url, order_id);
        self.get_with_retry(&url).await
    }

    // -- internal helpers ---------------------------------------------------

    /// POST JSON with automatic retry on transient errors.
    async fn post_with_retry<Req, Res>(&self, url: &str, body: &Req) -> WagyuResult<Res>
    where
        Req: Serialize + std::fmt::Debug,
        Res: for<'de> Deserialize<'de>,
    {
        let mut last_err: Option<WagyuError> = None;

        for attempt in 0..MAX_RETRIES {
            if attempt > 0 {
                let backoff = Duration::from_millis(INITIAL_BACKOFF_MS * 2u64.pow(attempt - 1));
                debug!(attempt, ?backoff, "wagyu POST retry backoff");
                tokio::time::sleep(backoff).await;
            }

            match self.do_post::<Req, Res>(url, body).await {
                Ok(res) => return Ok(res),
                Err(e) if e.is_retryable() => {
                    warn!(attempt, %e, "wagyu POST transient error, will retry");
                    last_err = Some(e);
                }
                Err(e) => return Err(e),
            }
        }

        Err(last_err.unwrap_or_else(|| WagyuError::Other("retry loop exited unexpectedly".into())))
    }

    /// GET with automatic retry on transient errors.
    async fn get_with_retry<Res>(&self, url: &str) -> WagyuResult<Res>
    where
        Res: for<'de> Deserialize<'de>,
    {
        let mut last_err: Option<WagyuError> = None;

        for attempt in 0..MAX_RETRIES {
            if attempt > 0 {
                let backoff = Duration::from_millis(INITIAL_BACKOFF_MS * 2u64.pow(attempt - 1));
                debug!(attempt, ?backoff, "wagyu GET retry backoff");
                tokio::time::sleep(backoff).await;
            }

            match self.do_get::<Res>(url).await {
                Ok(res) => return Ok(res),
                Err(e) if e.is_retryable() => {
                    warn!(attempt, %e, "wagyu GET transient error, will retry");
                    last_err = Some(e);
                }
                Err(e) => return Err(e),
            }
        }

        Err(last_err.unwrap_or_else(|| WagyuError::Other("retry loop exited unexpectedly".into())))
    }

    /// Single-shot POST request.
    async fn do_post<Req, Res>(&self, url: &str, body: &Req) -> WagyuResult<Res>
    where
        Req: Serialize + std::fmt::Debug,
        Res: for<'de> Deserialize<'de>,
    {
        debug!(?body, url, "wagyu POST");

        let response = self
            .http
            .post(url)
            .json(body)
            .send()
            .await
            .map_err(WagyuError::NetworkError)?;

        self.handle_response(response).await
    }

    /// Single-shot GET request.
    async fn do_get<Res>(&self, url: &str) -> WagyuResult<Res>
    where
        Res: for<'de> Deserialize<'de>,
    {
        debug!(url, "wagyu GET");

        let response = self
            .http
            .get(url)
            .send()
            .await
            .map_err(WagyuError::NetworkError)?;

        self.handle_response(response).await
    }

    /// Convert an HTTP response into either a deserialized success type or an error.
    async fn handle_response<Res>(&self, response: reqwest::Response) -> WagyuResult<Res>
    where
        Res: for<'de> Deserialize<'de>,
    {
        let status = response.status();

        if status.is_success() {
            let bytes = response.bytes().await.map_err(WagyuError::NetworkError)?;
            serde_json::from_slice(&bytes).map_err(|e| {
                WagyuError::InvalidResponse(format!(
                    "failed to deserialize success response: {e} — body: {}",
                    String::from_utf8_lossy(&bytes)
                ))
            })
        } else {
            let status_code = status.as_u16();
            let body = response.text().await.unwrap_or_default();

            // Try to extract a message from the JSON error body.
            let message = serde_json::from_str::<ApiErrorBody>(&body)
                .ok()
                .and_then(|b| b.message.or(b.error))
                .unwrap_or(body);

            Err(WagyuError::ApiError {
                status: status_code,
                message,
            })
        }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn order_status_roundtrip() {
        let json = serde_json::to_string(&OrderStatus::AwaitingDeposit).unwrap();
        assert_eq!(json, r#""awaiting_deposit""#);

        let parsed: OrderStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, OrderStatus::AwaitingDeposit);
    }

    #[test]
    fn quote_request_serializes_camel_case() {
        let req = QuoteRequest {
            from_chain_id: CHAIN_ARBITRUM,
            to_chain_id: CHAIN_MONERO,
            from_token: USDC_ARBITRUM.to_string(),
            to_token: XMR_NATIVE.to_string(),
            from_amount: "100.0".to_string(),
        };
        let json = serde_json::to_value(&req).unwrap();
        assert!(json.get("fromChainId").is_some());
        assert!(json.get("toChainId").is_some());
        assert!(json.get("fromToken").is_some());
        assert!(json.get("toToken").is_some());
        assert!(json.get("fromAmount").is_some());
    }

    #[test]
    fn order_request_omits_none_integrator_fields() {
        let req = OrderRequest {
            from_chain_id: CHAIN_BITCOIN,
            to_chain_id: CHAIN_MONERO,
            from_token: BTC_NATIVE.to_string(),
            to_token: XMR_NATIVE.to_string(),
            from_amount: "0.01".to_string(),
            to_address: "888...".to_string(),
            integrator_fee_percent: None,
            integrator_fee_address: None,
        };
        let json = serde_json::to_value(&req).unwrap();
        assert!(json.get("integratorFeePercent").is_none());
        assert!(json.get("integratorFeeAddress").is_none());
    }

    #[test]
    fn constants_are_correct() {
        assert_eq!(CHAIN_ARBITRUM, 42161);
        assert_eq!(CHAIN_SOLANA, 1151111081099710);
        assert_eq!(CHAIN_BITCOIN, 20000000000001);
        assert_eq!(CHAIN_MONERO, 0);
    }
}
