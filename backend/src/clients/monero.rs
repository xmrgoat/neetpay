//! Monero wallet-rpc JSON-RPC client.
//!
//! All monetary amounts are represented as **piconero** (`u64`) internally.
//! Conversion to XMR (`f64`) should only happen at API boundaries.

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

use crate::errors::{MoneroError, MoneroResult};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// 1 XMR = 10^12 piconero.
pub const PICONERO_PER_XMR: u64 = 1_000_000_000_000;

/// Default HTTP timeout for RPC calls (30 s).
const DEFAULT_TIMEOUT: Duration = Duration::from_secs(30);

// ---------------------------------------------------------------------------
// Public result types
// ---------------------------------------------------------------------------

/// A newly created subaddress.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubAddress {
    pub address: String,
    pub address_index: u32,
}

/// A single incoming transfer.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transfer {
    pub txid: String,
    /// Amount in piconero.
    pub amount: u64,
    pub address: String,
    pub confirmations: u64,
    pub height: u64,
    pub timestamp: u64,
    pub subaddr_index: SubaddrIndex,
}

/// Subaddress index as returned by monero-wallet-rpc.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubaddrIndex {
    pub major: u32,
    pub minor: u32,
}

/// Result of `validate_address`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidateAddressResult {
    pub valid: bool,
    pub integrated: bool,
    pub subaddress: bool,
    pub nettype: String,
}

/// Wallet balance.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalanceResult {
    /// Total balance in piconero.
    pub balance: u64,
    /// Unlocked (spendable) balance in piconero.
    pub unlocked_balance: u64,
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/// Async client for monero-wallet-rpc.
#[derive(Debug, Clone)]
pub struct MoneroClient {
    rpc_url: String,
    username: String,
    password: String,
    http_client: Client,
}

impl MoneroClient {
    /// Create a new client.
    ///
    /// `rpc_url` — full base URL (e.g. `http://127.0.0.1:18082/json_rpc`).
    /// Digest auth credentials come from env in practice; kept explicit here
    /// so the struct is testable.
    pub fn new(rpc_url: String, username: String, password: String) -> Self {
        let http_client = Client::builder()
            .timeout(DEFAULT_TIMEOUT)
            .build()
            .expect("failed to build reqwest client");

        Self {
            rpc_url,
            username,
            password,
            http_client,
        }
    }

    /// Build from environment variables.
    ///
    /// Reads `MONERO_RPC_URL`, `MONERO_RPC_USER`, `MONERO_RPC_PASS`.
    pub fn from_env() -> MoneroResult<Self> {
        let rpc_url = std::env::var("MONERO_RPC_URL")
            .map_err(|_| MoneroError::Other("MONERO_RPC_URL not set".into()))?;
        let username = std::env::var("MONERO_RPC_USER").unwrap_or_default();
        let password = std::env::var("MONERO_RPC_PASS").unwrap_or_default();
        Ok(Self::new(rpc_url, username, password))
    }

    // -----------------------------------------------------------------------
    // Public RPC methods
    // -----------------------------------------------------------------------

    /// Generate a new subaddress for the given account.
    ///
    /// `label` should be the invoice UUID so we can correlate later.
    pub async fn create_address(
        &self,
        account_index: u32,
        label: &str,
    ) -> MoneroResult<SubAddress> {
        #[derive(Serialize)]
        struct Params<'a> {
            account_index: u32,
            label: &'a str,
        }

        #[derive(Deserialize)]
        struct Res {
            address: String,
            address_index: u32,
        }

        let res: Res = self
            .rpc_call(
                "create_address",
                &Params {
                    account_index,
                    label,
                },
            )
            .await?;

        Ok(SubAddress {
            address: res.address,
            address_index: res.address_index,
        })
    }

    /// Fetch incoming (and optionally pending) transfers for an account.
    pub async fn get_transfers(
        &self,
        r#in: bool,
        pending: bool,
        account_index: u32,
    ) -> MoneroResult<Vec<Transfer>> {
        #[derive(Serialize)]
        struct Params {
            r#in: bool,
            pending: bool,
            account_index: u32,
        }

        #[derive(Deserialize)]
        struct Res {
            #[serde(default)]
            r#in: Vec<RawTransfer>,
            #[serde(default)]
            pending: Vec<RawTransfer>,
        }

        #[derive(Deserialize)]
        struct RawTransfer {
            txid: String,
            amount: u64,
            address: String,
            #[serde(default)]
            confirmations: u64,
            #[serde(default)]
            height: u64,
            #[serde(default)]
            timestamp: u64,
            subaddr_index: SubaddrIndex,
        }

        let res: Res = self
            .rpc_call(
                "get_transfers",
                &Params {
                    r#in,
                    pending,
                    account_index,
                },
            )
            .await?;

        let map_transfer = |t: RawTransfer| Transfer {
            txid: t.txid,
            amount: t.amount,
            address: t.address,
            confirmations: t.confirmations,
            height: t.height,
            timestamp: t.timestamp,
            subaddr_index: t.subaddr_index,
        };

        let mut transfers: Vec<Transfer> = res.r#in.into_iter().map(map_transfer).collect();
        transfers.extend(res.pending.into_iter().map(|t| Transfer {
            txid: t.txid,
            amount: t.amount,
            address: t.address,
            confirmations: t.confirmations,
            height: t.height,
            timestamp: t.timestamp,
            subaddr_index: t.subaddr_index,
        }));

        Ok(transfers)
    }

    /// Validate a Monero address.
    pub async fn validate_address(
        &self,
        address: &str,
    ) -> MoneroResult<ValidateAddressResult> {
        #[derive(Serialize)]
        struct Params<'a> {
            address: &'a str,
        }

        #[derive(Deserialize)]
        struct Res {
            valid: bool,
            integrated: bool,
            subaddress: bool,
            nettype: String,
        }

        let res: Res = self
            .rpc_call("validate_address", &Params { address })
            .await?;

        Ok(ValidateAddressResult {
            valid: res.valid,
            integrated: res.integrated,
            subaddress: res.subaddress,
            nettype: res.nettype,
        })
    }

    /// Get the balance for a given account index.
    pub async fn get_balance(&self, account_index: u32) -> MoneroResult<BalanceResult> {
        #[derive(Serialize)]
        struct Params {
            account_index: u32,
        }

        #[derive(Deserialize)]
        struct Res {
            balance: u64,
            unlocked_balance: u64,
        }

        let res: Res = self
            .rpc_call("get_balance", &Params { account_index })
            .await?;

        Ok(BalanceResult {
            balance: res.balance,
            unlocked_balance: res.unlocked_balance,
        })
    }

    /// Get a specific transfer by its transaction id.
    ///
    /// Useful for checking confirmation count on a known tx.
    pub async fn get_transfer_by_txid(&self, txid: &str) -> MoneroResult<Transfer> {
        #[derive(Serialize)]
        struct Params<'a> {
            txid: &'a str,
        }

        #[derive(Deserialize)]
        struct Res {
            transfer: RawTransfer,
        }

        #[derive(Deserialize)]
        struct RawTransfer {
            txid: String,
            amount: u64,
            address: String,
            #[serde(default)]
            confirmations: u64,
            #[serde(default)]
            height: u64,
            #[serde(default)]
            timestamp: u64,
            subaddr_index: SubaddrIndex,
        }

        let res: Res = self
            .rpc_call("get_transfer_by_txid", &Params { txid })
            .await?;

        Ok(Transfer {
            txid: res.transfer.txid,
            amount: res.transfer.amount,
            address: res.transfer.address,
            confirmations: res.transfer.confirmations,
            height: res.transfer.height,
            timestamp: res.transfer.timestamp,
            subaddr_index: res.transfer.subaddr_index,
        })
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /// Convert piconero to XMR. Use only at API boundaries.
    pub fn piconero_to_xmr(piconero: u64) -> f64 {
        piconero as f64 / PICONERO_PER_XMR as f64
    }

    /// Convert XMR to piconero. Use only at API boundaries.
    pub fn xmr_to_piconero(xmr: f64) -> u64 {
        (xmr * PICONERO_PER_XMR as f64).round() as u64
    }

    // -----------------------------------------------------------------------
    // Internal JSON-RPC transport
    // -----------------------------------------------------------------------

    /// Execute a JSON-RPC call against monero-wallet-rpc.
    async fn rpc_call<P: Serialize, R: serde::de::DeserializeOwned>(
        &self,
        method: &str,
        params: &P,
    ) -> MoneroResult<R> {
        let body = serde_json::json!({
            "jsonrpc": "2.0",
            "id": "0",
            "method": method,
            "params": params,
        });

        tracing::debug!(method, "monero rpc call");

        let response = self
            .http_client
            .post(&self.rpc_url)
            .basic_auth(&self.username, Some(&self.password))
            .json(&body)
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    MoneroError::Timeout
                } else {
                    MoneroError::NetworkError(e)
                }
            })?;

        let status = response.status();
        if !status.is_success() {
            let text = response.text().await.unwrap_or_default();
            return Err(MoneroError::RpcError {
                code: status.as_u16() as i64,
                message: format!("HTTP {status}: {text}"),
            });
        }

        let rpc_response: RpcResponse<R> = response.json().await.map_err(|e| {
            MoneroError::DeserializationError(e.to_string())
        })?;

        if let Some(err) = rpc_response.error {
            return Err(MoneroError::RpcError {
                code: err.code,
                message: err.message,
            });
        }

        rpc_response
            .result
            .ok_or_else(|| MoneroError::MissingField("result".into()))
    }
}

// ---------------------------------------------------------------------------
// JSON-RPC envelope types (internal)
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
struct RpcResponse<T> {
    #[allow(dead_code)]
    jsonrpc: String,
    #[allow(dead_code)]
    id: String,
    result: Option<T>,
    error: Option<RpcError>,
}

#[derive(Deserialize)]
struct RpcError {
    code: i64,
    message: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn piconero_conversion_round_trip() {
        let xmr = 1.234567890123;
        let pico = MoneroClient::xmr_to_piconero(xmr);
        let back = MoneroClient::piconero_to_xmr(pico);
        assert!((xmr - back).abs() < 1e-12);
    }

    #[test]
    fn one_xmr_is_1e12_piconero() {
        assert_eq!(MoneroClient::xmr_to_piconero(1.0), PICONERO_PER_XMR);
        assert_eq!(MoneroClient::piconero_to_xmr(PICONERO_PER_XMR), 1.0);
    }
}
