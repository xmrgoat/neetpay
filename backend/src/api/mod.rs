pub mod auth;
pub mod cards;
pub mod error;
pub mod invoices;
pub mod jwt_auth;
pub mod merchants;
pub mod middleware;

use std::sync::Arc;

use axum::{
    middleware as axum_middleware,
    routing::{get, post},
    Router,
};
use sqlx::PgPool;
use tower_http::{
    cors::CorsLayer,
    trace::TraceLayer,
};

use crate::clients::email::ResendClient;
use crate::clients::monero::MoneroClient;
use crate::clients::trocador::TrocadorClient;
use crate::clients::wagyu::WagyuClient;

// ---------------------------------------------------------------------------
// Shared application state
// ---------------------------------------------------------------------------

pub struct AppState {
    pub pool: PgPool,
    pub monero: MoneroClient,
    pub wagyu: WagyuClient,
    pub trocador: TrocadorClient,
    pub resend: ResendClient,
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn router(
    pool: PgPool,
    monero: MoneroClient,
    wagyu: WagyuClient,
    trocador: TrocadorClient,
    resend: ResendClient,
) -> Router {
    let state = Arc::new(AppState {
        pool,
        monero,
        wagyu,
        trocador,
        resend,
    });

    // Routes that require API key authentication (merchant integrations).
    let api_key_routes = Router::new()
        .route("/v1/invoices", post(invoices::create_invoice))
        .route("/v1/invoices", get(invoices::list_invoices))
        .route("/v1/merchants/me", get(merchants::get_me))
        .layer(axum_middleware::from_fn_with_state(
            state.clone(),
            middleware::auth_middleware,
        ));

    // Routes that require JWT authentication (dashboard).
    let jwt_routes = Router::new()
        .route("/v1/auth/me", get(auth::me))
        .route("/v1/auth/logout", post(auth::logout))
        .route("/v1/cards", get(cards::list_cards))
        .route("/v1/cards/order", post(cards::order_prepaid_card))
        .route("/v1/cards/order/{id}", get(cards::get_card_order))
        .route("/v1/cards/orders", get(cards::list_card_orders))
        .route("/v1/giftcards", get(cards::list_gift_cards))
        .route("/v1/giftcards/order", post(cards::order_gift_card))
        .layer(axum_middleware::from_fn_with_state(
            state.clone(),
            jwt_auth::jwt_auth_middleware,
        ));

    // Public routes (no auth).
    let public_routes = Router::new()
        .route("/v1/invoices/{id}", get(invoices::get_invoice))
        .route("/v1/merchants", post(merchants::create_merchant))
        .route("/v1/auth/request", post(auth::request_magic_link))
        .route("/v1/auth/verify", get(auth::verify_magic_link))
        .route("/v1/auth/poll", get(auth::poll_magic_link));

    // Health check.
    let health = Router::new().route("/health", get(health_check));

    Router::new()
        .merge(api_key_routes)
        .merge(jwt_routes)
        .merge(public_routes)
        .merge(health)
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(state)
}

async fn health_check() -> &'static str {
    "ok"
}
