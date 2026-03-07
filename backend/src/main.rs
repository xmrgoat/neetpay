mod api;
mod clients;
mod db;
mod errors;
mod models;
mod workers;

use std::net::SocketAddr;

use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::EnvFilter;

use clients::email::ResendClient;
use clients::monero::MoneroClient;
use clients::trocador::TrocadorClient;
use clients::wagyu::WagyuClient;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    // Database.
    let database_url = std::env::var("DATABASE_URL")?;
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(&database_url)
        .await?;

    sqlx::migrate!().run(&pool).await?;

    // Clients — initialised from env vars.
    let monero = MoneroClient::from_env()
        .map_err(|e| anyhow::anyhow!("failed to init monero client: {e}"))?;
    let wagyu = WagyuClient::new(None, None)
        .map_err(|e| anyhow::anyhow!("failed to init wagyu client: {e}"))?;
    let trocador = TrocadorClient::from_env()
        .map_err(|e| anyhow::anyhow!("failed to init trocador client: {e}"))?;
    let resend = ResendClient::from_env()
        .map_err(|e| anyhow::anyhow!("failed to init resend client: {e}"))?;

    tracing::info!("all clients initialised");

    let app = api::router(pool.clone(), monero, wagyu, trocador, resend);

    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "8080".into())
        .parse()
        .unwrap_or(8080);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("neetpay API listening on {addr}");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
