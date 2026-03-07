use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::clients::trocador::{RateRequest, TradeRequest};
use crate::clients::wagyu::{
    self, OrderRequest as WagyuOrderRequest, QuoteRequest as WagyuQuoteRequest,
    CHAIN_ARBITRUM, CHAIN_BITCOIN, CHAIN_MONERO, CHAIN_SOLANA,
};
use crate::models::NewInvoice;

use super::error::AppError;
use super::middleware::AuthMerchant;
use super::AppState;

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct CreateInvoiceRequest {
    pub amount_xmr: f64,
    pub amount_fiat: Option<f64>,
    pub fiat_currency: Option<String>,
    pub description: Option<String>,
    pub callback_url: Option<String>,
    pub return_url: Option<String>,
    pub metadata: Option<serde_json::Value>,
    /// Source currency ticker (e.g. "XMR", "BTC", "USDC", "TRX", "BNB").
    pub source_currency: Option<String>,
    /// Source chain (e.g. "arbitrum", "solana", "bitcoin", "tron", "bsc").
    pub source_chain: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CreateInvoiceResponse {
    pub id: String,
    pub subaddress: String,
    pub deposit_address: Option<String>,
    pub deposit_amount: Option<f64>,
    pub status: String,
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct InvoiceResponse {
    pub id: String,
    pub merchant_id: String,
    pub amount_xmr: f64,
    pub amount_fiat: Option<f64>,
    pub fiat_currency: Option<String>,
    pub subaddress: String,
    pub status: String,
    pub swap_provider: Option<String>,
    pub deposit_address: Option<String>,
    pub deposit_chain: Option<String>,
    pub deposit_token: Option<String>,
    pub deposit_amount: Option<f64>,
    pub tx_hash: Option<String>,
    pub confirmations: i32,
    pub fee_percent: Option<f64>,
    pub fee_amount: Option<f64>,
    pub net_amount: Option<f64>,
    pub callback_url: Option<String>,
    pub return_url: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub description: Option<String>,
    pub expires_at: Option<String>,
    pub paid_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct ListInvoicesQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ListInvoicesResponse {
    pub invoices: Vec<InvoiceResponse>,
    pub total: i64,
}

// ---------------------------------------------------------------------------
// Swap routing
// ---------------------------------------------------------------------------

/// Determine which swap provider + chain/token params to use.
struct SwapRoute {
    provider: &'static str,
    wagyu_chain_id: Option<u64>,
    wagyu_from_token: Option<String>,
    trocador_ticker: Option<String>,
    trocador_network: Option<String>,
}

fn resolve_swap_route(
    source_currency: &str,
    source_chain: &str,
) -> Result<SwapRoute, AppError> {
    let currency_upper = source_currency.to_uppercase();
    let chain_lower = source_chain.to_lowercase();

    match (currency_upper.as_str(), chain_lower.as_str()) {
        // -- Wagyu routes --
        ("BTC", "bitcoin" | "btc") => Ok(SwapRoute {
            provider: "wagyu",
            wagyu_chain_id: Some(CHAIN_BITCOIN),
            wagyu_from_token: Some(wagyu::BTC_NATIVE.to_string()),
            trocador_ticker: None,
            trocador_network: None,
        }),
        ("ETH", "arbitrum" | "arb") => Ok(SwapRoute {
            provider: "wagyu",
            wagyu_chain_id: Some(CHAIN_ARBITRUM),
            wagyu_from_token: Some(wagyu::ETH_ARBITRUM.to_string()),
            trocador_ticker: None,
            trocador_network: None,
        }),
        ("USDC", "arbitrum" | "arb") => Ok(SwapRoute {
            provider: "wagyu",
            wagyu_chain_id: Some(CHAIN_ARBITRUM),
            wagyu_from_token: Some(wagyu::USDC_ARBITRUM.to_string()),
            trocador_ticker: None,
            trocador_network: None,
        }),
        ("USDT", "arbitrum" | "arb") => Ok(SwapRoute {
            provider: "wagyu",
            wagyu_chain_id: Some(CHAIN_ARBITRUM),
            wagyu_from_token: Some(wagyu::USDT_ARBITRUM.to_string()),
            trocador_ticker: None,
            trocador_network: None,
        }),
        ("WBTC", "arbitrum" | "arb") => Ok(SwapRoute {
            provider: "wagyu",
            wagyu_chain_id: Some(CHAIN_ARBITRUM),
            wagyu_from_token: Some(wagyu::WBTC_ARBITRUM.to_string()),
            trocador_ticker: None,
            trocador_network: None,
        }),
        ("SOL", "solana" | "sol") => Ok(SwapRoute {
            provider: "wagyu",
            wagyu_chain_id: Some(CHAIN_SOLANA),
            wagyu_from_token: Some(wagyu::SOL_NATIVE.to_string()),
            trocador_ticker: None,
            trocador_network: None,
        }),

        // -- Trocador routes --
        ("TRX", "tron" | "trc20") => Ok(SwapRoute {
            provider: "trocador",
            wagyu_chain_id: None,
            wagyu_from_token: None,
            trocador_ticker: Some("TRX".into()),
            trocador_network: Some("Tron".into()),
        }),
        ("USDT", "tron" | "trc20") => Ok(SwapRoute {
            provider: "trocador",
            wagyu_chain_id: None,
            wagyu_from_token: None,
            trocador_ticker: Some("USDT".into()),
            trocador_network: Some("Tron".into()),
        }),
        ("BNB", "bsc" | "bep20") => Ok(SwapRoute {
            provider: "trocador",
            wagyu_chain_id: None,
            wagyu_from_token: None,
            trocador_ticker: Some("BNB".into()),
            trocador_network: Some("BSC".into()),
        }),
        ("USDT", "bsc" | "bep20") => Ok(SwapRoute {
            provider: "trocador",
            wagyu_chain_id: None,
            wagyu_from_token: None,
            trocador_ticker: Some("USDT".into()),
            trocador_network: Some("BSC".into()),
        }),

        _ => Err(AppError::BadRequest(format!(
            "unsupported source: {} on {}",
            source_currency, source_chain
        ))),
    }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// POST /v1/invoices — create a new invoice.
pub async fn create_invoice(
    State(state): State<Arc<AppState>>,
    AuthMerchant(merchant): AuthMerchant,
    Json(body): Json<CreateInvoiceRequest>,
) -> Result<Json<CreateInvoiceResponse>, AppError> {
    // Validate amount.
    if body.amount_xmr <= 0.0 {
        return Err(AppError::Validation("amount_xmr must be positive".into()));
    }

    let invoice_id = uuid::Uuid::new_v4().to_string();
    let expires_at = Utc::now() + Duration::hours(1);

    // Step 1: Generate XMR subaddress.
    let subaddress = state
        .monero
        .create_address(0, &invoice_id)
        .await?;

    // Step 2: Determine swap route (if not paying directly in XMR).
    let source_currency = body
        .source_currency
        .as_deref()
        .unwrap_or("XMR")
        .to_uppercase();

    let mut swap_provider: Option<String> = None;
    let mut swap_order_id: Option<String> = None;
    let mut deposit_address: Option<String> = None;
    let mut deposit_chain: Option<String> = None;
    let mut deposit_token: Option<String> = None;
    let mut deposit_amount: Option<f64> = None;
    let mut status = "pending".to_string();

    if source_currency != "XMR" {
        let source_chain = body
            .source_chain
            .as_deref()
            .ok_or_else(|| AppError::Validation("source_chain required when source_currency is not XMR".into()))?;

        let route = resolve_swap_route(&source_currency, source_chain)?;

        match route.provider {
            "wagyu" => {
                let chain_id = route.wagyu_chain_id.unwrap();
                let from_token = route.wagyu_from_token.unwrap();

                // Get a quote first.
                let quote = state
                    .wagyu
                    .quote(&WagyuQuoteRequest {
                        from_chain_id: chain_id,
                        to_chain_id: CHAIN_MONERO,
                        from_token: from_token.clone(),
                        to_token: wagyu::XMR_NATIVE.to_string(),
                        from_amount: body.amount_xmr.to_string(),
                    })
                    .await?;

                // Create the swap order.
                let order = state
                    .wagyu
                    .create_order(&WagyuOrderRequest {
                        from_chain_id: chain_id,
                        to_chain_id: CHAIN_MONERO,
                        from_token: from_token.clone(),
                        to_token: wagyu::XMR_NATIVE.to_string(),
                        from_amount: quote.from_amount.clone(),
                        to_address: subaddress.address.clone(),
                        integrator_fee_percent: None,
                        integrator_fee_address: None,
                    })
                    .await?;

                swap_provider = Some("wagyu".into());
                swap_order_id = Some(order.order_id);
                deposit_address = Some(order.deposit_address);
                deposit_chain = Some(source_chain.to_string());
                deposit_token = Some(source_currency.clone());
                deposit_amount = order.deposit_amount.parse::<f64>().ok();
                status = "swap_pending".to_string();
            }
            "trocador" => {
                let ticker_from = route.trocador_ticker.unwrap();
                let network_from = route.trocador_network.unwrap();

                // Get rate (payment mode: merchant receives exact amount_to).
                let rate = state
                    .trocador
                    .new_rate(&RateRequest {
                        ticker_from: ticker_from.clone(),
                        network_from: network_from.clone(),
                        ticker_to: "XMR".into(),
                        network_to: "Monero".into(),
                        amount_from: None,
                        amount_to: Some(body.amount_xmr),
                        payment: true,
                    })
                    .await?;

                // Pick the first (best) quote.
                let best_quote = rate
                    .quotes
                    .first()
                    .ok_or_else(|| AppError::Internal("no trocador quotes available".into()))?;

                // Create the trade.
                let trade = state
                    .trocador
                    .new_trade(&TradeRequest {
                        id: rate.trade_id.clone(),
                        ticker_from: ticker_from.clone(),
                        network_from: network_from.clone(),
                        ticker_to: "XMR".into(),
                        network_to: "Monero".into(),
                        amount_from: best_quote.amount_from,
                        amount_to: Some(body.amount_xmr),
                        address: subaddress.address.clone(),
                        provider: best_quote.provider.clone(),
                        fixed: best_quote.fixed,
                        payment: true,
                        webhook: None,
                        webhook_key: None,
                    })
                    .await?;

                swap_provider = Some("trocador".into());
                swap_order_id = Some(trade.trade_id);
                deposit_address = trade.address_provider;
                deposit_chain = Some(source_chain.to_string());
                deposit_token = Some(source_currency.clone());
                deposit_amount = trade.amount_from;
                status = "swap_pending".to_string();
            }
            _ => unreachable!(),
        }
    }

    // Step 3: Compute fee.
    let fee_pct = merchant.fee_percent;
    let fee_amt = body.amount_xmr * (fee_pct / 100.0);
    let net_amt = body.amount_xmr - fee_amt;

    // Step 4: Insert invoice into DB.
    let new_invoice = NewInvoice {
        merchant_id: merchant.id.clone(),
        amount_xmr: body.amount_xmr,
        amount_fiat: body.amount_fiat,
        fiat_currency: body.fiat_currency.clone(),
        subaddress: subaddress.address.clone(),
        status: Some(status.clone()),
        swap_provider: swap_provider.clone(),
        swap_order_id: swap_order_id.clone(),
        deposit_address: deposit_address.clone(),
        deposit_chain: deposit_chain.clone(),
        deposit_token: deposit_token.clone(),
        deposit_amount,
        fee_percent: Some(fee_pct),
        fee_amount: Some(fee_amt),
        net_amount: Some(net_amt),
        callback_url: body.callback_url.clone(),
        return_url: body.return_url.clone(),
        metadata: body.metadata.clone(),
        description: body.description.clone(),
        expires_at: Some(expires_at),
    };

    sqlx::query(
        r#"
        INSERT INTO invoices (
            id, merchant_id, amount_xmr, amount_fiat, fiat_currency,
            subaddress, status,
            swap_provider, swap_order_id, deposit_address, deposit_chain, deposit_token, deposit_amount,
            fee_percent, fee_amount, net_amount,
            callback_url, return_url, metadata, description,
            expires_at
        ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7,
            $8, $9, $10, $11, $12, $13,
            $14, $15, $16,
            $17, $18, $19, $20,
            $21
        )
        "#,
    )
    .bind(&invoice_id)
    .bind(&new_invoice.merchant_id)
    .bind(new_invoice.amount_xmr)
    .bind(new_invoice.amount_fiat)
    .bind(&new_invoice.fiat_currency)
    .bind(&new_invoice.subaddress)
    .bind(&status)
    .bind(&new_invoice.swap_provider)
    .bind(&new_invoice.swap_order_id)
    .bind(&new_invoice.deposit_address)
    .bind(&new_invoice.deposit_chain)
    .bind(&new_invoice.deposit_token)
    .bind(new_invoice.deposit_amount)
    .bind(new_invoice.fee_percent)
    .bind(new_invoice.fee_amount)
    .bind(new_invoice.net_amount)
    .bind(&new_invoice.callback_url)
    .bind(&new_invoice.return_url)
    .bind(&new_invoice.metadata)
    .bind(&new_invoice.description)
    .bind(expires_at)
    .execute(&state.pool)
    .await?;

    Ok(Json(CreateInvoiceResponse {
        id: invoice_id,
        subaddress: subaddress.address,
        deposit_address,
        deposit_amount,
        status,
        expires_at: Some(expires_at.to_rfc3339()),
    }))
}

/// GET /v1/invoices/:id — get invoice status (public, no auth required).
pub async fn get_invoice(
    State(state): State<Arc<AppState>>,
    Path(invoice_id): Path<String>,
) -> Result<Json<InvoiceResponse>, AppError> {
    let invoice = sqlx::query_as::<_, crate::models::Invoice>(
        "SELECT * FROM invoices WHERE id = $1",
    )
    .bind(&invoice_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("invoice not found".into()))?;

    Ok(Json(invoice_to_response(invoice)))
}

/// GET /v1/invoices — list invoices for the authenticated merchant.
pub async fn list_invoices(
    State(state): State<Arc<AppState>>,
    AuthMerchant(merchant): AuthMerchant,
    Query(params): Query<ListInvoicesQuery>,
) -> Result<Json<ListInvoicesResponse>, AppError> {
    let limit = params.limit.unwrap_or(50).min(100);
    let offset = params.offset.unwrap_or(0).max(0);

    let (invoices, total) = if let Some(ref status_filter) = params.status {
        let rows = sqlx::query_as::<_, crate::models::Invoice>(
            "SELECT * FROM invoices WHERE merchant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        )
        .bind(&merchant.id)
        .bind(status_filter)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.pool)
        .await?;

        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM invoices WHERE merchant_id = $1 AND status = $2",
        )
        .bind(&merchant.id)
        .bind(status_filter)
        .fetch_one(&state.pool)
        .await?;

        (rows, count.0)
    } else {
        let rows = sqlx::query_as::<_, crate::models::Invoice>(
            "SELECT * FROM invoices WHERE merchant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(&merchant.id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.pool)
        .await?;

        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM invoices WHERE merchant_id = $1",
        )
        .bind(&merchant.id)
        .fetch_one(&state.pool)
        .await?;

        (rows, count.0)
    };

    let invoice_responses: Vec<InvoiceResponse> = invoices
        .into_iter()
        .map(invoice_to_response)
        .collect();

    Ok(Json(ListInvoicesResponse {
        invoices: invoice_responses,
        total,
    }))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn invoice_to_response(inv: crate::models::Invoice) -> InvoiceResponse {
    InvoiceResponse {
        id: inv.id,
        merchant_id: inv.merchant_id,
        amount_xmr: inv.amount_xmr,
        amount_fiat: inv.amount_fiat,
        fiat_currency: inv.fiat_currency,
        subaddress: inv.subaddress,
        status: inv.status,
        swap_provider: inv.swap_provider,
        deposit_address: inv.deposit_address,
        deposit_chain: inv.deposit_chain,
        deposit_token: inv.deposit_token,
        deposit_amount: inv.deposit_amount,
        tx_hash: inv.tx_hash,
        confirmations: inv.confirmations,
        fee_percent: inv.fee_percent,
        fee_amount: inv.fee_amount,
        net_amount: inv.net_amount,
        callback_url: inv.callback_url,
        return_url: inv.return_url,
        metadata: inv.metadata,
        description: inv.description,
        expires_at: inv.expires_at.map(|t| t.to_rfc3339()),
        paid_at: inv.paid_at.map(|t| t.to_rfc3339()),
        created_at: inv.created_at.to_rfc3339(),
    }
}
