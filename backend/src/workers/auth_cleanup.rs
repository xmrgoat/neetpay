use sqlx::PgPool;
use std::time::Duration;

/// Periodically clean up expired magic links and auth sessions.
/// Runs every hour.
pub async fn run(pool: PgPool) {
    let interval = Duration::from_secs(3600);

    loop {
        tokio::time::sleep(interval).await;

        match cleanup(&pool).await {
            Ok((links, sessions)) => {
                if links > 0 || sessions > 0 {
                    tracing::info!(
                        expired_magic_links = links,
                        expired_sessions = sessions,
                        "auth cleanup completed"
                    );
                }
            }
            Err(e) => {
                tracing::error!(error = %e, "auth cleanup failed");
            }
        }
    }
}

async fn cleanup(pool: &PgPool) -> Result<(u64, u64), sqlx::Error> {
    // Delete expired or used magic links.
    let links = sqlx::query(
        "DELETE FROM magic_links WHERE expires_at < NOW() OR used = TRUE",
    )
    .execute(pool)
    .await?
    .rows_affected();

    // Delete expired auth sessions.
    let sessions = sqlx::query(
        "DELETE FROM auth_sessions WHERE expires_at < NOW()",
    )
    .execute(pool)
    .await?
    .rows_affected();

    Ok((links, sessions))
}
