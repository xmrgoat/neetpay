//! Polls Wagyu and Trocador swap orders for status transitions.
//!
//! Runs every 15 seconds. Picks up invoices in `swap_pending` status and
//! checks the upstream swap provider for completion or failure.

use std::time::Duration;

use sqlx::PgPool;
use tokio::time;
use tracing::{error, info, warn};

use crate::clients::trocador::{TrocadorClient, TradeStatus};
use crate::clients::wagyu::{OrderStatus, WagyuClient};

/// Row shape for invoices we need to poll.
#[derive(Debug, sqlx::FromRow)]
struct SwapInvoice {
    id: String,
    swap_provider: Option<String>,
    swap_order_id: Option<String>,
}

/// Main loop — runs forever.
pub async fn run(pool: PgPool, wagyu: WagyuClient, trocador: TrocadorClient) {
    let mut interval = time::interval(Duration::from_secs(15));

    loop {
        interval.tick().await;

        if let Err(e) = poll_once(&pool, &wagyu, &trocador).await {
            error!(error = %e, "swap_poller tick failed");
        }
    }
}

async fn poll_once(
    pool: &PgPool,
    wagyu: &WagyuClient,
    trocador: &TrocadorClient,
) -> anyhow::Result<()> {
    let invoices: Vec<SwapInvoice> = sqlx::query_as(
        "SELECT id, swap_provider, swap_order_id FROM invoices WHERE status = 'swap_pending'"
    )
    .fetch_all(pool)
    .await?;

    if invoices.is_empty() {
        return Ok(());
    }

    info!(count = invoices.len(), "swap_poller: checking swap orders");

    for inv in &invoices {
        let provider = match &inv.swap_provider {
            Some(p) => p.as_str(),
            None => {
                warn!(invoice_id = %inv.id, "swap_pending invoice has no swap_provider, skipping");
                continue;
            }
        };

        let order_id = match &inv.swap_order_id {
            Some(id) => id.as_str(),
            None => {
                warn!(invoice_id = %inv.id, "swap_pending invoice has no swap_order_id, skipping");
                continue;
            }
        };

        match provider {
            "wagyu" => poll_wagyu(pool, wagyu, &inv.id, order_id).await,
            "trocador" => poll_trocador(pool, trocador, &inv.id, order_id).await,
            other => {
                warn!(invoice_id = %inv.id, provider = %other, "unknown swap_provider");
            }
        }
    }

    Ok(())
}

async fn poll_wagyu(pool: &PgPool, wagyu: &WagyuClient, invoice_id: &str, order_id: &str) {
    match wagyu.get_order(order_id).await {
        Ok(details) => {
            let new_status = match details.status {
                OrderStatus::Completed => Some("confirming"),
                OrderStatus::Failed | OrderStatus::Expired | OrderStatus::Refunded => {
                    Some("failed")
                }
                _ => None,
            };

            if let Some(status) = new_status {
                info!(
                    invoice_id = %invoice_id,
                    wagyu_status = %details.status,
                    new_status = %status,
                    "swap_poller: wagyu order transitioned"
                );

                if let Err(e) = sqlx::query(
                    "UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2"
                )
                .bind(status)
                .bind(invoice_id)
                .execute(pool)
                .await
                {
                    error!(invoice_id = %invoice_id, error = %e, "failed to update invoice status");
                }
            }
        }
        Err(e) => {
            warn!(
                invoice_id = %invoice_id,
                order_id = %order_id,
                error = %e,
                "swap_poller: failed to poll wagyu order"
            );
        }
    }
}

async fn poll_trocador(
    pool: &PgPool,
    trocador: &TrocadorClient,
    invoice_id: &str,
    order_id: &str,
) {
    match trocador.get_trade(order_id).await {
        Ok(trade) => {
            let new_status = match trade.status {
                TradeStatus::Finished => Some("confirming"),
                TradeStatus::Failed | TradeStatus::Expired | TradeStatus::Refunded => {
                    Some("failed")
                }
                TradeStatus::Halted => Some("failed"),
                _ => None,
            };

            if let Some(status) = new_status {
                info!(
                    invoice_id = %invoice_id,
                    trocador_status = %trade.status,
                    new_status = %status,
                    "swap_poller: trocador trade transitioned"
                );

                if let Err(e) = sqlx::query(
                    "UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2"
                )
                .bind(status)
                .bind(invoice_id)
                .execute(pool)
                .await
                {
                    error!(invoice_id = %invoice_id, error = %e, "failed to update invoice status");
                }
            }
        }
        Err(e) => {
            warn!(
                invoice_id = %invoice_id,
                order_id = %order_id,
                error = %e,
                "swap_poller: failed to poll trocador trade"
            );
        }
    }
}
