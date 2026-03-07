//! Background workers for invoice lifecycle management.
//!
//! - **swap_poller** — polls Wagyu/Trocador for swap order status updates
//! - **xmr_watcher** — watches incoming XMR transactions and confirmations
//! - **webhook_sender** — delivers webhook notifications to merchants
//! - **expiry_checker** — expires stale invoices past their deadline
//! - **card_poller** — polls Trocador for card order status updates

pub mod auth_cleanup;
pub mod card_poller;
pub mod expiry_checker;
pub mod swap_poller;
pub mod webhook_sender;
pub mod xmr_watcher;

use sqlx::PgPool;

use crate::clients::monero::MoneroClient;
use crate::clients::trocador::TrocadorClient;
use crate::clients::wagyu::WagyuClient;

/// Spawn all background workers. Returns `JoinHandle`s so the caller can
/// optionally await them (they all run infinite loops).
pub async fn start_workers(
    pool: PgPool,
    monero: MoneroClient,
    wagyu: WagyuClient,
    trocador: TrocadorClient,
) {
    tracing::info!("starting background workers");

    let pool_swap = pool.clone();
    let wagyu_clone = wagyu.clone();
    let trocador_clone = trocador.clone();
    tokio::spawn(async move {
        swap_poller::run(pool_swap, wagyu_clone, trocador_clone).await;
    });

    let pool_xmr = pool.clone();
    let monero_clone = monero.clone();
    tokio::spawn(async move {
        xmr_watcher::run(pool_xmr, monero_clone).await;
    });

    let pool_webhook = pool.clone();
    tokio::spawn(async move {
        webhook_sender::run(pool_webhook).await;
    });

    let pool_expiry = pool.clone();
    tokio::spawn(async move {
        expiry_checker::run(pool_expiry).await;
    });

    let pool_card = pool.clone();
    let trocador_card = trocador.clone();
    tokio::spawn(async move {
        card_poller::run(pool_card, trocador_card).await;
    });

    let pool_auth = pool.clone();
    tokio::spawn(async move {
        auth_cleanup::run(pool_auth).await;
    });

    tracing::info!("all background workers spawned");
}
