//! Expires invoices that have passed their deadline.
//!
//! Runs every 60 seconds. Picks up invoices in `pending` or `swap_pending`
//! status where `expires_at < NOW()` and sets them to `expired`.

use std::time::Duration;

use sqlx::PgPool;
use tokio::time;
use tracing::{error, info};

/// Main loop — runs forever.
pub async fn run(pool: PgPool) {
    let mut interval = time::interval(Duration::from_secs(60));

    loop {
        interval.tick().await;

        if let Err(e) = expire_once(&pool).await {
            error!(error = %e, "expiry_checker tick failed");
        }
    }
}

async fn expire_once(pool: &PgPool) -> anyhow::Result<()> {
    let result = sqlx::query(
        "UPDATE invoices \
         SET status = 'expired', updated_at = NOW() \
         WHERE status IN ('pending', 'swap_pending') \
           AND expires_at IS NOT NULL \
           AND expires_at < NOW()"
    )
    .execute(pool)
    .await?;

    let count = result.rows_affected();
    if count > 0 {
        info!(count = count, "expiry_checker: expired invoices");
    }

    Ok(())
}
