use sqlx::PgPool;
use std::time::Duration;
use tracing::{error, info, warn};

use crate::clients::trocador::TrocadorClient;
use crate::models::card_order;

/// Poll pending card orders every 30 seconds and update their status.
pub async fn run(pool: PgPool, trocador: TrocadorClient) {
    info!("card_poller worker started");

    loop {
        if let Err(e) = poll_once(&pool, &trocador).await {
            error!(error = %e, "card_poller error");
        }
        tokio::time::sleep(Duration::from_secs(30)).await;
    }
}

async fn poll_once(pool: &PgPool, trocador: &TrocadorClient) -> anyhow::Result<()> {
    let pending = card_order::find_pending(pool).await?;

    if pending.is_empty() {
        return Ok(());
    }

    info!(count = pending.len(), "polling pending card orders");

    for order in pending {
        match trocador.get_trade(&order.trocador_trade_id).await {
            Ok(trade) => {
                let status_str = trade.status.to_string();

                match status_str.as_str() {
                    "finished" => {
                        info!(
                            order_id = %order.id,
                            trade_id = %order.trocador_trade_id,
                            "card order delivered"
                        );

                        card_order::update_status(pool, &order.id, "delivered").await?;

                        // Store trade response as card details
                        let details = serde_json::json!({
                            "trade_id": trade.trade_id,
                            "status": "delivered",
                            "amount_from": trade.amount_from,
                            "amount_to": trade.amount_to,
                        });
                        card_order::update_card_details(pool, &order.id, details).await?;

                        // Privacy: clear email after delivery
                        card_order::clear_email(pool, &order.id).await?;
                    }
                    "failed" | "expired" | "refunded" => {
                        warn!(
                            order_id = %order.id,
                            trade_id = %order.trocador_trade_id,
                            trade_status = %status_str,
                            "card order failed"
                        );
                        card_order::update_status(pool, &order.id, "failed").await?;
                        // Privacy: clear email on failure too
                        card_order::clear_email(pool, &order.id).await?;
                    }
                    _ => {
                        // Still in progress (new, waiting, confirming, sending)
                    }
                }
            }
            Err(e) => {
                warn!(
                    order_id = %order.id,
                    error = %e,
                    "failed to poll card order trade status"
                );
            }
        }
    }

    Ok(())
}
