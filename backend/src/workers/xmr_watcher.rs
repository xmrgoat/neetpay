//! Watches incoming XMR transactions and tracks confirmations.
//!
//! Runs every 30 seconds. Picks up invoices in `confirming` or `pending`
//! (direct XMR payments) status and checks monero-wallet-rpc for matching
//! transactions on their subaddress.
//!
//! Once a transaction reaches 10 confirmations the invoice is marked `paid`.
//! Fee calculation: `fee_amount = amount_xmr * fee_percent / 100`,
//! `net_amount = amount_xmr - fee_amount`.

use std::time::Duration;

use sqlx::PgPool;
use tokio::time;
use tracing::{error, info, warn};

use crate::clients::monero::{MoneroClient, PICONERO_PER_XMR};

/// Number of confirmations required before an invoice is considered paid.
const REQUIRED_CONFIRMATIONS: u64 = 10;

/// Row shape for invoices we need to watch.
#[derive(Debug, sqlx::FromRow)]
struct WatchInvoice {
    id: String,
    subaddress: String,
    amount_xmr: f64,
    tx_hash: Option<String>,
    fee_percent: Option<f64>,
    status: String,
}

/// Main loop — runs forever.
pub async fn run(pool: PgPool, monero: MoneroClient) {
    let mut interval = time::interval(Duration::from_secs(30));

    loop {
        interval.tick().await;

        if let Err(e) = check_once(&pool, &monero).await {
            error!(error = %e, "xmr_watcher tick failed");
        }
    }
}

async fn check_once(pool: &PgPool, monero: &MoneroClient) -> anyhow::Result<()> {
    let invoices: Vec<WatchInvoice> = sqlx::query_as(
        "SELECT id, subaddress, amount_xmr, tx_hash, fee_percent, status \
         FROM invoices \
         WHERE status IN ('confirming', 'pending')"
    )
    .fetch_all(pool)
    .await?;

    if invoices.is_empty() {
        return Ok(());
    }

    info!(count = invoices.len(), "xmr_watcher: checking invoices");

    for inv in &invoices {
        if let Err(e) = check_invoice(pool, monero, inv).await {
            warn!(
                invoice_id = %inv.id,
                error = %e,
                "xmr_watcher: failed to check invoice"
            );
        }
    }

    Ok(())
}

async fn check_invoice(
    pool: &PgPool,
    monero: &MoneroClient,
    inv: &WatchInvoice,
) -> anyhow::Result<()> {
    // If we already know the tx_hash, just check confirmations on that tx.
    if let Some(ref txid) = inv.tx_hash {
        return check_known_tx(pool, monero, inv, txid).await;
    }

    // Otherwise, scan all incoming transfers for one matching this subaddress.
    let transfers = monero.get_transfers(true, true, 0).await?;

    let matching = transfers
        .iter()
        .find(|t| t.address == inv.subaddress);

    let transfer = match matching {
        Some(t) => t,
        None => return Ok(()), // No tx found yet — nothing to do.
    };

    // Convert piconero to XMR.
    let amount_xmr = transfer.amount as f64 / PICONERO_PER_XMR as f64;
    let confirmations = transfer.confirmations;

    info!(
        invoice_id = %inv.id,
        tx_hash = %transfer.txid,
        amount_xmr = %amount_xmr,
        confirmations = %confirmations,
        "xmr_watcher: new transaction detected on subaddress"
    );

    if confirmations >= REQUIRED_CONFIRMATIONS {
        mark_paid(pool, inv, &transfer.txid, confirmations, amount_xmr).await?;
    } else {
        // Update tx_hash and confirmations, set status to confirming.
        sqlx::query(
            "UPDATE invoices \
             SET status = 'confirming', tx_hash = $1, confirmations = $2, updated_at = NOW() \
             WHERE id = $3"
        )
        .bind(&transfer.txid)
        .bind(confirmations as i32)
        .bind(&inv.id)
        .execute(pool)
        .await?;
    }

    Ok(())
}

async fn check_known_tx(
    pool: &PgPool,
    monero: &MoneroClient,
    inv: &WatchInvoice,
    txid: &str,
) -> anyhow::Result<()> {
    let transfer = monero.get_transfer_by_txid(txid).await?;
    let confirmations = transfer.confirmations;
    let amount_xmr = transfer.amount as f64 / PICONERO_PER_XMR as f64;

    if confirmations >= REQUIRED_CONFIRMATIONS {
        mark_paid(pool, inv, txid, confirmations, amount_xmr).await?;
    } else {
        // Just update the confirmation count.
        sqlx::query(
            "UPDATE invoices SET confirmations = $1, updated_at = NOW() WHERE id = $2"
        )
        .bind(confirmations as i32)
        .bind(&inv.id)
        .execute(pool)
        .await?;

        info!(
            invoice_id = %inv.id,
            confirmations = %confirmations,
            "xmr_watcher: confirmation update (need {})",
            REQUIRED_CONFIRMATIONS
        );
    }

    Ok(())
}

async fn mark_paid(
    pool: &PgPool,
    inv: &WatchInvoice,
    txid: &str,
    confirmations: u64,
    amount_xmr: f64,
) -> anyhow::Result<()> {
    let fee_percent = inv.fee_percent.unwrap_or(0.4);
    let fee_amount = amount_xmr * fee_percent / 100.0;
    let net_amount = amount_xmr - fee_amount;

    info!(
        invoice_id = %inv.id,
        tx_hash = %txid,
        confirmations = %confirmations,
        amount_xmr = %amount_xmr,
        fee_amount = %fee_amount,
        net_amount = %net_amount,
        "xmr_watcher: invoice PAID"
    );

    sqlx::query(
        "UPDATE invoices \
         SET status = 'paid', \
             tx_hash = $1, \
             confirmations = $2, \
             fee_percent = $3, \
             fee_amount = $4, \
             net_amount = $5, \
             paid_at = NOW(), \
             updated_at = NOW() \
         WHERE id = $6"
    )
    .bind(txid)
    .bind(confirmations as i32)
    .bind(fee_percent)
    .bind(fee_amount)
    .bind(net_amount)
    .bind(&inv.id)
    .execute(pool)
    .await?;

    Ok(())
}
