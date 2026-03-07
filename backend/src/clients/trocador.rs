use std::time::Duration;

use reqwest::Client;
use serde::{Deserialize, Serialize};
use tracing::{debug, warn};

use crate::errors::TrocadorError;

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/// Async client for the Trocador exchange aggregator API.
///
/// All requests are `GET` with query parameters.
/// Auth is via the `API-Key` header.
#[derive(Debug, Clone)]
pub struct TrocadorClient {
    base_url: String,
    api_key: String,
    /// Markup percentage applied to rates (default 0).
    pub markup: f64,
    http_client: Client,
}

impl TrocadorClient {
    /// Create a new `TrocadorClient`.
    ///
    /// * `base_url` – e.g. `https://trocador.app/api` (no trailing slash).
    /// * `api_key`  – value sent in the `API-Key` header.
    /// * `markup`   – markup percentage forwarded to the API (typically 0).
    pub fn new(base_url: impl Into<String>, api_key: impl Into<String>, markup: f64) -> Self {
        let http_client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("failed to build reqwest client");

        Self {
            base_url: base_url.into().trim_end_matches('/').to_string(),
            api_key: api_key.into(),
            markup,
            http_client,
        }
    }

    /// Build from environment variables:
    /// - `TROCADOR_API_URL` (defaults to `https://trocador.app/api`)
    /// - `TROCADOR_API_KEY` (required)
    /// - `TROCADOR_MARKUP`  (defaults to `0`)
    pub fn from_env() -> Result<Self, TrocadorError> {
        let base_url = std::env::var("TROCADOR_API_URL")
            .unwrap_or_else(|_| "https://trocador.app/api".to_string());
        let api_key = std::env::var("TROCADOR_API_KEY")
            .map_err(|_| TrocadorError::ApiError("TROCADOR_API_KEY env var not set".into()))?;
        let markup: f64 = std::env::var("TROCADOR_MARKUP")
            .unwrap_or_else(|_| "0".into())
            .parse()
            .unwrap_or(0.0);

        Ok(Self::new(base_url, api_key, markup))
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    /// Execute a GET request with automatic retries (3 attempts, exponential
    /// backoff) on transient network errors.
    async fn get_with_retry<T: serde::de::DeserializeOwned>(
        &self,
        path: &str,
        query: &[(&str, String)],
    ) -> Result<T, TrocadorError> {
        let url = format!("{}{}", self.base_url, path);
        let max_attempts: u32 = 3;

        let mut last_err: Option<TrocadorError> = None;

        for attempt in 0..max_attempts {
            if attempt > 0 {
                let delay = Duration::from_millis(500 * 2u64.pow(attempt - 1));
                warn!(
                    attempt,
                    delay_ms = delay.as_millis() as u64,
                    "retrying trocador request"
                );
                tokio::time::sleep(delay).await;
            }

            let result = self
                .http_client
                .get(&url)
                .header("API-Key", &self.api_key)
                .query(query)
                .send()
                .await;

            match result {
                Ok(resp) => {
                    let status = resp.status();
                    let body = resp.text().await.map_err(TrocadorError::NetworkError)?;

                    debug!(status = %status, body_len = body.len(), "trocador response");

                    if !status.is_success() {
                        return Err(TrocadorError::ApiError(format!(
                            "HTTP {}: {}",
                            status,
                            truncate(&body, 500)
                        )));
                    }

                    // Trocador may return an error object like {"error": "..."}
                    if let Ok(api_err) = serde_json::from_str::<ApiErrorBody>(&body) {
                        if let Some(msg) = api_err.error {
                            return Err(TrocadorError::ApiError(msg));
                        }
                    }

                    let parsed: T = serde_json::from_str(&body).map_err(|e| {
                        TrocadorError::InvalidResponse(format!(
                            "{}: {}",
                            e,
                            truncate(&body, 300)
                        ))
                    })?;

                    return Ok(parsed);
                }
                Err(e) => {
                    last_err = Some(TrocadorError::NetworkError(e));
                }
            }
        }

        Err(last_err.unwrap_or_else(|| {
            TrocadorError::ApiError("all retry attempts exhausted".into())
        }))
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /// `GET /coins` — list all supported tokens.
    pub async fn coins(&self) -> Result<Vec<Coin>, TrocadorError> {
        self.get_with_retry("/coins", &[]).await
    }

    /// `GET /new_rate` — get rate quotes from multiple providers.
    ///
    /// When `payment` is true and `amount_to` is set, the API returns how much
    /// the payer must send so that the merchant receives exactly `amount_to`.
    /// This is the primary mode for fixed-amount NeetPay invoices.
    pub async fn new_rate(&self, req: &RateRequest) -> Result<RateResponse, TrocadorError> {
        if req.amount_from.is_none() && req.amount_to.is_none() {
            return Err(TrocadorError::ApiError(
                "either amount_from or amount_to must be set".into(),
            ));
        }

        let mut params: Vec<(&str, String)> = vec![
            ("ticker_from", req.ticker_from.clone()),
            ("network_from", req.network_from.clone()),
            ("ticker_to", req.ticker_to.clone()),
            ("network_to", req.network_to.clone()),
            ("payment", req.payment.to_string()),
            ("min_kycrating", "A".into()),
            ("markup", self.markup.to_string()),
        ];

        if let Some(af) = req.amount_from {
            params.push(("amount_from", af.to_string()));
        }
        if let Some(at) = req.amount_to {
            params.push(("amount_to", at.to_string()));
        }

        self.get_with_retry("/new_rate", &params).await
    }

    /// `GET /new_trade` — create a trade (returns deposit address for the payer).
    pub async fn new_trade(&self, req: &TradeRequest) -> Result<TradeResponse, TrocadorError> {
        let mut params: Vec<(&str, String)> = vec![
            ("id", req.id.clone()),
            ("ticker_from", req.ticker_from.clone()),
            ("network_from", req.network_from.clone()),
            ("ticker_to", req.ticker_to.clone()),
            ("network_to", req.network_to.clone()),
            ("address", req.address.clone()),
            ("provider", req.provider.clone()),
            ("fixed", req.fixed.to_string()),
            ("payment", req.payment.to_string()),
        ];

        if let Some(af) = req.amount_from {
            params.push(("amount_from", af.to_string()));
        }
        if let Some(at) = req.amount_to {
            params.push(("amount_to", at.to_string()));
        }
        if let Some(ref wh) = req.webhook {
            params.push(("webhook", wh.clone()));
        }
        if let Some(ref wk) = req.webhook_key {
            params.push(("webhook_key", wk.clone()));
        }

        self.get_with_retry("/new_trade", &params).await
    }

    /// `GET /trade?id=TRADE_ID` — poll trade status.
    pub async fn get_trade(&self, trade_id: &str) -> Result<TradeResponse, TrocadorError> {
        let params = [("id", trade_id.to_string())];
        self.get_with_retry("/trade", &params).await
    }

    /// `GET /cards` — list available prepaid cards.
    pub async fn cards(&self) -> Result<Vec<PrepaidCard>, TrocadorError> {
        self.get_with_retry("/cards", &[]).await
    }

    /// `GET /order_prepaidcard` — purchase a prepaid card.
    pub async fn order_prepaid_card(
        &self,
        req: &OrderPrepaidCardRequest,
    ) -> Result<TradeResponse, TrocadorError> {
        let params: Vec<(&str, String)> = vec![
            ("provider", req.provider.clone()),
            ("currency_code", req.currency_code.clone()),
            ("ticker_from", req.ticker_from.clone()),
            ("network_from", req.network_from.clone()),
            ("amount", req.amount.to_string()),
            ("email", req.email.clone()),
            ("card_markup", req.card_markup.to_string()),
        ];

        self.get_with_retry("/order_prepaidcard", &params).await
    }

    /// `GET /giftcards?country=XX` — list gift cards available in a country.
    pub async fn gift_cards(&self, country: &str) -> Result<Vec<GiftCard>, TrocadorError> {
        let params = [("country", country.to_string())];
        self.get_with_retry("/giftcards", &params).await
    }

    /// `GET /order_giftcard` — purchase a gift card.
    pub async fn order_gift_card(
        &self,
        req: &OrderGiftCardRequest,
    ) -> Result<TradeResponse, TrocadorError> {
        let params: Vec<(&str, String)> = vec![
            ("product_id", req.product_id.clone()),
            ("ticker_from", req.ticker_from.clone()),
            ("network_from", req.network_from.clone()),
            ("amount", req.amount.to_string()),
            ("email", req.email.clone()),
        ];

        self.get_with_retry("/order_giftcard", &params).await
    }
}

// ---------------------------------------------------------------------------
// Request / response types
// ---------------------------------------------------------------------------

/// Internal: used to detect `{"error": "..."}` responses from Trocador.
#[derive(Deserialize)]
struct ApiErrorBody {
    error: Option<String>,
}

/// A supported coin/token on Trocador.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Coin {
    pub name: String,
    pub ticker: String,
    pub network: String,
    #[serde(default)]
    pub minimum: Option<f64>,
    #[serde(default)]
    pub maximum: Option<f64>,
    #[serde(default)]
    pub image: Option<String>,
}

/// Parameters for `GET /new_rate`.
#[derive(Debug, Clone, Serialize)]
pub struct RateRequest {
    pub ticker_from: String,
    pub network_from: String,
    pub ticker_to: String,
    pub network_to: String,
    /// Set this for "I want to send X" mode.
    pub amount_from: Option<f64>,
    /// Set this for "merchant receives exactly X" mode (payment=true).
    pub amount_to: Option<f64>,
    /// When true, enables payment mode (merchant receives exact amount_to).
    pub payment: bool,
}

/// Response from `GET /new_rate`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateResponse {
    pub trade_id: String,
    #[serde(default)]
    pub quotes: Vec<Quote>,
}

/// A single provider quote inside a `RateResponse`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Quote {
    pub provider: String,
    #[serde(default)]
    pub amount_from: Option<f64>,
    #[serde(default)]
    pub amount_to: Option<f64>,
    #[serde(default)]
    pub fixed: bool,
    #[serde(default)]
    pub eta_minutes: Option<u32>,
}

/// Parameters for `GET /new_trade`.
#[derive(Debug, Clone, Serialize)]
pub struct TradeRequest {
    /// The `trade_id` returned by `new_rate`.
    pub id: String,
    pub ticker_from: String,
    pub network_from: String,
    pub ticker_to: String,
    pub network_to: String,
    pub amount_from: Option<f64>,
    pub amount_to: Option<f64>,
    /// Destination XMR address (the NeetPay subaddress).
    pub address: String,
    /// Chosen provider name from the quotes.
    pub provider: String,
    /// Whether this is a fixed-rate trade.
    pub fixed: bool,
    /// Payment mode (see `RateRequest::payment`).
    pub payment: bool,
    /// Optional webhook URL for trade status updates.
    pub webhook: Option<String>,
    /// Optional HMAC key for webhook signature verification.
    pub webhook_key: Option<String>,
}

/// Response from `GET /new_trade` and `GET /trade`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeResponse {
    pub trade_id: String,
    #[serde(default)]
    pub status: TradeStatus,
    /// Address where the payer must send their crypto.
    #[serde(default)]
    pub address_provider: Option<String>,
    /// Memo/tag for the deposit (e.g. for XRP, XLM).
    #[serde(default)]
    pub address_provider_memo: Option<String>,
    #[serde(default)]
    pub amount_from: Option<f64>,
    #[serde(default)]
    pub amount_to: Option<f64>,
    #[serde(default)]
    pub coin_from: Option<String>,
    #[serde(default)]
    pub coin_to: Option<String>,
}

/// Trade lifecycle status.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum TradeStatus {
    #[default]
    New,
    Waiting,
    Confirming,
    Sending,
    #[serde(rename = "paid_partially")]
    PaidPartially,
    Finished,
    Failed,
    Expired,
    Halted,
    Refunded,
}

impl TradeStatus {
    /// Returns `true` if the trade has reached a terminal state.
    pub fn is_terminal(&self) -> bool {
        matches!(
            self,
            TradeStatus::Finished
                | TradeStatus::Failed
                | TradeStatus::Expired
                | TradeStatus::Refunded
        )
    }
}

impl std::fmt::Display for TradeStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            TradeStatus::New => "new",
            TradeStatus::Waiting => "waiting",
            TradeStatus::Confirming => "confirming",
            TradeStatus::Sending => "sending",
            TradeStatus::PaidPartially => "paid_partially",
            TradeStatus::Finished => "finished",
            TradeStatus::Failed => "failed",
            TradeStatus::Expired => "expired",
            TradeStatus::Halted => "halted",
            TradeStatus::Refunded => "refunded",
        };
        write!(f, "{}", s)
    }
}

/// A prepaid card available on Trocador.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrepaidCard {
    pub provider: String,
    pub currency_code: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub price_range: Option<String>,
}

/// Parameters for `GET /order_prepaidcard`.
#[derive(Debug, Clone, Serialize)]
pub struct OrderPrepaidCardRequest {
    pub provider: String,
    pub currency_code: String,
    pub ticker_from: String,
    pub network_from: String,
    pub amount: f64,
    pub email: String,
    /// Markup percentage for the card (default 2).
    pub card_markup: f64,
}

impl Default for OrderPrepaidCardRequest {
    fn default() -> Self {
        Self {
            provider: String::new(),
            currency_code: String::new(),
            ticker_from: String::new(),
            network_from: String::new(),
            amount: 0.0,
            email: String::new(),
            card_markup: 2.0,
        }
    }
}

/// A gift card available on Trocador.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GiftCard {
    pub product_id: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub country: Option<String>,
    #[serde(default)]
    pub price_range: Option<String>,
    #[serde(default)]
    pub image: Option<String>,
}

/// Parameters for `GET /order_giftcard`.
#[derive(Debug, Clone, Serialize)]
pub struct OrderGiftCardRequest {
    pub product_id: String,
    pub ticker_from: String,
    pub network_from: String,
    pub amount: f64,
    pub email: String,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn truncate(s: &str, max: usize) -> &str {
    if s.len() <= max {
        s
    } else {
        &s[..max]
    }
}
