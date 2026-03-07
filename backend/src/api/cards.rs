use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::models::card_order::{self, NewCardOrder};

use super::error::AppError;
use super::middleware::AuthMerchant;
use super::AppState;

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct ListCardsQuery {
    pub currency: Option<String>,
    pub brand: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListGiftCardsQuery {
    pub country: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OrderPrepaidCardRequest {
    pub provider: String,
    pub currency_code: String,
    pub amount: f64,
    pub ticker_from: String,
    pub network_from: String,
    pub email: String,
}

#[derive(Debug, Deserialize)]
pub struct OrderGiftCardRequest {
    pub product_id: String,
    pub amount: f64,
    pub ticker_from: String,
    pub network_from: String,
    pub email: String,
}

#[derive(Debug, Serialize)]
pub struct OrderResponse {
    pub order_id: String,
    pub deposit_address: Option<String>,
    pub deposit_amount: Option<f64>,
    pub deposit_token: String,
    pub status: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct CardOrderResponse {
    pub id: String,
    pub order_type: String,
    pub provider: String,
    pub currency_code: String,
    pub amount_fiat: f64,
    pub ticker_from: String,
    pub deposit_address: String,
    pub deposit_amount: String,
    pub status: String,
    pub card_details: Option<serde_json::Value>,
    pub created_at: String,
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// GET /v1/cards — list available prepaid cards.
pub async fn list_cards(
    State(state): State<Arc<AppState>>,
    _merchant: AuthMerchant,
    Query(params): Query<ListCardsQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let cards = state.trocador.cards().await?;

    let filtered: Vec<_> = cards
        .into_iter()
        .filter(|c| {
            if let Some(ref currency) = params.currency {
                if !c.currency_code.eq_ignore_ascii_case(currency) {
                    return false;
                }
            }
            if let Some(ref brand) = params.brand {
                if !c.provider.to_lowercase().contains(&brand.to_lowercase()) {
                    return false;
                }
            }
            true
        })
        .collect();

    Ok(Json(serde_json::json!({ "cards": filtered })))
}

/// GET /v1/giftcards — list available gift cards.
pub async fn list_gift_cards(
    State(state): State<Arc<AppState>>,
    _merchant: AuthMerchant,
    Query(params): Query<ListGiftCardsQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let country = params.country.as_deref().unwrap_or("US");
    let cards = state.trocador.gift_cards(country).await?;
    Ok(Json(serde_json::json!({ "gift_cards": cards })))
}

/// POST /v1/cards/order — order a prepaid card.
pub async fn order_prepaid_card(
    State(state): State<Arc<AppState>>,
    AuthMerchant(merchant): AuthMerchant,
    Json(body): Json<OrderPrepaidCardRequest>,
) -> Result<Json<OrderResponse>, AppError> {
    if body.amount <= 0.0 {
        return Err(AppError::Validation("amount must be positive".into()));
    }

    let trade = state
        .trocador
        .order_prepaid_card(&crate::clients::trocador::OrderPrepaidCardRequest {
            provider: body.provider.clone(),
            currency_code: body.currency_code.clone(),
            ticker_from: body.ticker_from.clone(),
            network_from: body.network_from.clone(),
            amount: body.amount,
            email: body.email.clone(),
            card_markup: 2.0,
        })
        .await?;

    let order = card_order::create(
        &state.pool,
        NewCardOrder {
            merchant_id: merchant.id.clone(),
            order_type: "prepaid".into(),
            trocador_trade_id: trade.trade_id.clone(),
            provider: body.provider.clone(),
            currency_code: body.currency_code.clone(),
            amount_fiat: body.amount,
            ticker_from: body.ticker_from.clone(),
            network_from: body.network_from.clone(),
            deposit_address: trade.address_provider.clone().unwrap_or_default(),
            deposit_amount: trade
                .amount_from
                .map(|a| a.to_string())
                .unwrap_or_default(),
            email: body.email.clone(),
        },
    )
    .await?;

    Ok(Json(OrderResponse {
        order_id: order.id,
        deposit_address: trade.address_provider,
        deposit_amount: trade.amount_from,
        deposit_token: body.ticker_from,
        status: "pending".into(),
        message: format!(
            "Send {} to the deposit address to complete your prepaid card order",
            trade
                .amount_from
                .map(|a| a.to_string())
                .unwrap_or("the required amount".into())
        ),
    }))
}

/// POST /v1/giftcards/order — order a gift card.
pub async fn order_gift_card(
    State(state): State<Arc<AppState>>,
    AuthMerchant(merchant): AuthMerchant,
    Json(body): Json<OrderGiftCardRequest>,
) -> Result<Json<OrderResponse>, AppError> {
    if body.amount <= 0.0 {
        return Err(AppError::Validation("amount must be positive".into()));
    }

    let trade = state
        .trocador
        .order_gift_card(&crate::clients::trocador::OrderGiftCardRequest {
            product_id: body.product_id.clone(),
            ticker_from: body.ticker_from.clone(),
            network_from: body.network_from.clone(),
            amount: body.amount,
            email: body.email.clone(),
        })
        .await?;

    let order = card_order::create(
        &state.pool,
        NewCardOrder {
            merchant_id: merchant.id.clone(),
            order_type: "giftcard".into(),
            trocador_trade_id: trade.trade_id.clone(),
            provider: "trocador".into(),
            currency_code: "USD".into(),
            amount_fiat: body.amount,
            ticker_from: body.ticker_from.clone(),
            network_from: body.network_from.clone(),
            deposit_address: trade.address_provider.clone().unwrap_or_default(),
            deposit_amount: trade
                .amount_from
                .map(|a| a.to_string())
                .unwrap_or_default(),
            email: body.email.clone(),
        },
    )
    .await?;

    Ok(Json(OrderResponse {
        order_id: order.id,
        deposit_address: trade.address_provider,
        deposit_amount: trade.amount_from,
        deposit_token: body.ticker_from,
        status: "pending".into(),
        message: format!(
            "Send {} to the deposit address to complete your gift card order",
            trade
                .amount_from
                .map(|a| a.to_string())
                .unwrap_or("the required amount".into())
        ),
    }))
}

/// GET /v1/cards/order/:id — get card order status.
pub async fn get_card_order(
    State(state): State<Arc<AppState>>,
    AuthMerchant(merchant): AuthMerchant,
    Path(order_id): Path<String>,
) -> Result<Json<CardOrderResponse>, AppError> {
    let order = card_order::find_by_id(&state.pool, &order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("card order not found".into()))?;

    if order.merchant_id != merchant.id {
        return Err(AppError::NotFound("card order not found".into()));
    }

    let details = if order.status == "delivered" {
        order.card_details.clone()
    } else {
        None
    };

    Ok(Json(CardOrderResponse {
        id: order.id,
        order_type: order.order_type,
        provider: order.provider,
        currency_code: order.currency_code,
        amount_fiat: order.amount_fiat,
        ticker_from: order.ticker_from,
        deposit_address: order.deposit_address,
        deposit_amount: order.deposit_amount,
        status: order.status,
        card_details: details,
        created_at: order.created_at.to_rfc3339(),
    }))
}

/// GET /v1/cards/orders — list card orders for the authenticated merchant.
pub async fn list_card_orders(
    State(state): State<Arc<AppState>>,
    AuthMerchant(merchant): AuthMerchant,
) -> Result<Json<serde_json::Value>, AppError> {
    let orders = card_order::find_by_merchant(&state.pool, &merchant.id).await?;

    let responses: Vec<CardOrderResponse> = orders
        .into_iter()
        .map(|o| {
            let details = if o.status == "delivered" {
                o.card_details.clone()
            } else {
                None
            };
            CardOrderResponse {
                id: o.id,
                order_type: o.order_type,
                provider: o.provider,
                currency_code: o.currency_code,
                amount_fiat: o.amount_fiat,
                ticker_from: o.ticker_from,
                deposit_address: o.deposit_address,
                deposit_amount: o.deposit_amount,
                status: o.status,
                card_details: details,
                created_at: o.created_at.to_rfc3339(),
            }
        })
        .collect();

    Ok(Json(serde_json::json!({ "orders": responses })))
}
