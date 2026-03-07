//! Delivers webhook notifications to merchants when invoices are paid.
//!
//! Runs every 10 seconds. Picks up newly-paid invoices that have a merchant
//! webhook_url configured, sends a signed POST request, and logs the result.
//! Failed deliveries are retried with exponential backoff up to 5 attempts.

use std::time::Duration;

use chrono::Utc;
use hmac::{Hmac, Mac};
use reqwest::Client;
use sha2::Sha256;
use sqlx::PgPool;
use tokio::time;
use tracing::{error, info, warn};
use uuid::Uuid;

type HmacSha256 = Hmac<Sha256>;

/// Maximum number of delivery attempts per webhook event.
const MAX_ATTEMPTS: i32 = 5;

/// Backoff schedule in seconds: 60, 300, 1800 (1 min, 5 min, 30 min).
const BACKOFF_SECS: [i64; 3] = [60, 300, 1800];

/// Timeout for outgoing webhook HTTP requests.
const WEBHOOK_TIMEOUT: Duration = Duration::from_secs(15);

/// Row shape for a newly-paid invoice that needs a webhook.
#[derive(Debug, sqlx::FromRow)]
struct PaidInvoice {
    id: String,
    merchant_id: String,
    amount_xmr: f64,
    tx_hash: Option<String>,
    paid_at: Option<chrono::DateTime<Utc>>,
}

/// Row shape for merchant webhook config.
#[derive(Debug, sqlx::FromRow)]
struct MerchantWebhook {
    webhook_url: Option<String>,
    webhook_secret: Option<String>,
}

/// Row shape for a webhook log entry that needs retrying.
#[derive(Debug, sqlx::FromRow)]
struct RetryLog {
    id: String,
    invoice_id: Option<String>,
    merchant_id: String,
    url: String,
    payload: String,
    attempts: i32,
}

/// Main loop — runs forever.
pub async fn run(pool: PgPool) {
    let http = Client::builder()
        .timeout(WEBHOOK_TIMEOUT)
        .build()
        .expect("failed to build webhook http client");

    let mut interval = time::interval(Duration::from_secs(10));

    loop {
        interval.tick().await;

        if let Err(e) = send_new_webhooks(&pool, &http).await {
            error!(error = %e, "webhook_sender: failed to process new webhooks");
        }

        if let Err(e) = retry_failed_webhooks(&pool, &http).await {
            error!(error = %e, "webhook_sender: failed to process retries");
        }
    }
}

/// Find newly-paid invoices that don't yet have a webhook_log entry and fire
/// the initial webhook.
async fn send_new_webhooks(pool: &PgPool, http: &Client) -> anyhow::Result<()> {
    // Invoices that are paid and have no webhook_log entry yet.
    let invoices: Vec<PaidInvoice> = sqlx::query_as(
        "SELECT i.id, i.merchant_id, i.amount_xmr, i.tx_hash, i.paid_at \
         FROM invoices i \
         WHERE i.status = 'paid' \
           AND NOT EXISTS ( \
               SELECT 1 FROM webhook_logs wl WHERE wl.invoice_id = i.id \
           )"
    )
    .fetch_all(pool)
    .await?;

    for inv in &invoices {
        let merchant: Option<MerchantWebhook> = sqlx::query_as(
            "SELECT webhook_url, webhook_secret FROM merchants WHERE id = $1"
        )
        .bind(&inv.merchant_id)
        .fetch_optional(pool)
        .await?;

        let merchant = match merchant {
            Some(m) => m,
            None => continue,
        };

        let webhook_url = match &merchant.webhook_url {
            Some(url) if !url.is_empty() => url.clone(),
            _ => continue, // No webhook configured — skip.
        };

        let payload = build_payload(inv);

        let signature = sign_payload(&payload, merchant.webhook_secret.as_deref());

        info!(
            invoice_id = %inv.id,
            url = %webhook_url,
            "webhook_sender: sending initial webhook"
        );

        deliver_webhook(pool, http, &inv.id, &inv.merchant_id, &webhook_url, &payload, &signature)
            .await;
    }

    Ok(())
}

/// Retry webhook_log entries that previously failed and are due for a retry.
async fn retry_failed_webhooks(pool: &PgPool, http: &Client) -> anyhow::Result<()> {
    let retries: Vec<RetryLog> = sqlx::query_as(
        "SELECT id, invoice_id, merchant_id, url, payload, attempts \
         FROM webhook_logs \
         WHERE success = false \
           AND attempts < $1 \
           AND (next_retry_at IS NULL OR next_retry_at <= NOW())"
    )
    .bind(MAX_ATTEMPTS)
    .fetch_all(pool)
    .await?;

    for entry in &retries {
        // Fetch the merchant secret for signing.
        let secret: Option<(Option<String>,)> = sqlx::query_as(
            "SELECT webhook_secret FROM merchants WHERE id = $1"
        )
        .bind(&entry.merchant_id)
        .fetch_optional(pool)
        .await?;

        let webhook_secret = secret.and_then(|s| s.0);
        let signature = sign_payload(&entry.payload, webhook_secret.as_deref());

        info!(
            webhook_log_id = %entry.id,
            attempt = entry.attempts + 1,
            url = %entry.url,
            "webhook_sender: retrying webhook"
        );

        retry_deliver(pool, http, entry, &signature).await;
    }

    Ok(())
}

fn build_payload(inv: &PaidInvoice) -> String {
    let paid_at = inv
        .paid_at
        .map(|t| t.to_rfc3339())
        .unwrap_or_default();

    serde_json::json!({
        "event": "invoice.paid",
        "invoice_id": inv.id,
        "amount_xmr": inv.amount_xmr,
        "tx_hash": inv.tx_hash,
        "paid_at": paid_at
    })
    .to_string()
}

fn sign_payload(payload: &str, secret: Option<&str>) -> String {
    let key = secret.unwrap_or("neetpay-default-key");
    let mut mac = HmacSha256::new_from_slice(key.as_bytes())
        .expect("HMAC can take key of any size");
    mac.update(payload.as_bytes());
    let result = mac.finalize();
    format!("sha256={}", hex::encode(result.into_bytes()))
}

async fn deliver_webhook(
    pool: &PgPool,
    http: &Client,
    invoice_id: &str,
    merchant_id: &str,
    url: &str,
    payload: &str,
    signature: &str,
) {
    let result = http
        .post(url)
        .header("Content-Type", "application/json")
        .header("X-NeetPay-Signature", signature)
        .body(payload.to_string())
        .send()
        .await;

    let (status_code, success) = match result {
        Ok(resp) => {
            let code = resp.status().as_u16() as i32;
            let ok = resp.status().is_success();
            (code, ok)
        }
        Err(e) => {
            warn!(invoice_id = %invoice_id, error = %e, "webhook delivery failed (network)");
            (0, false)
        }
    };

    let next_retry = if !success {
        // First retry at BACKOFF_SECS[0] from now.
        Some(Utc::now() + chrono::Duration::seconds(BACKOFF_SECS[0]))
    } else {
        None
    };

    let log_id = Uuid::new_v4().to_string();

    if let Err(e) = sqlx::query(
        "INSERT INTO webhook_logs (id, merchant_id, invoice_id, url, payload, status_code, success, attempts, next_retry_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8)"
    )
    .bind(&log_id)
    .bind(merchant_id)
    .bind(invoice_id)
    .bind(url)
    .bind(payload)
    .bind(status_code)
    .bind(success)
    .bind(next_retry)
    .execute(pool)
    .await
    {
        error!(invoice_id = %invoice_id, error = %e, "failed to insert webhook_log");
    }

    if success {
        info!(invoice_id = %invoice_id, status_code = %status_code, "webhook delivered successfully");
    } else {
        warn!(invoice_id = %invoice_id, status_code = %status_code, "webhook delivery failed, will retry");
    }
}

async fn retry_deliver(pool: &PgPool, http: &Client, entry: &RetryLog, signature: &str) {
    let result = http
        .post(&entry.url)
        .header("Content-Type", "application/json")
        .header("X-NeetPay-Signature", signature)
        .body(entry.payload.clone())
        .send()
        .await;

    let (status_code, success) = match result {
        Ok(resp) => {
            let code = resp.status().as_u16() as i32;
            let ok = resp.status().is_success();
            (code, ok)
        }
        Err(e) => {
            warn!(
                webhook_log_id = %entry.id,
                error = %e,
                "webhook retry failed (network)"
            );
            (0, false)
        }
    };

    let new_attempts = entry.attempts + 1;

    // Calculate next retry time based on the backoff schedule.
    let next_retry = if !success && new_attempts < MAX_ATTEMPTS {
        let idx = (new_attempts - 1).min(BACKOFF_SECS.len() as i32 - 1) as usize;
        Some(Utc::now() + chrono::Duration::seconds(BACKOFF_SECS[idx]))
    } else {
        None
    };

    if let Err(e) = sqlx::query(
        "UPDATE webhook_logs \
         SET status_code = $1, success = $2, attempts = $3, next_retry_at = $4 \
         WHERE id = $5"
    )
    .bind(status_code)
    .bind(success)
    .bind(new_attempts)
    .bind(next_retry)
    .bind(&entry.id)
    .execute(pool)
    .await
    {
        error!(webhook_log_id = %entry.id, error = %e, "failed to update webhook_log");
    }

    if success {
        info!(webhook_log_id = %entry.id, attempts = new_attempts, "webhook retry succeeded");
    } else if new_attempts >= MAX_ATTEMPTS {
        error!(webhook_log_id = %entry.id, "webhook max retries exhausted, giving up");
    } else {
        warn!(
            webhook_log_id = %entry.id,
            attempts = new_attempts,
            "webhook retry failed, will retry again"
        );
    }
}
