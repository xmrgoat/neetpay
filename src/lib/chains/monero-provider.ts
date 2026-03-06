import type { ChainProvider, PaymentCheck, GeneratedAddress } from "./types";

const WALLET_RPC_URL =
  process.env.MONERO_WALLET_RPC_URL || "http://localhost:18083/json_rpc";
const RPC_USER = process.env.MONERO_WALLET_RPC_USER || "";
const RPC_PASS = process.env.MONERO_WALLET_RPC_PASSWORD || "";
const REQUIRED_CONFIRMATIONS = 10;

/**
 * Call monero-wallet-rpc JSON-RPC method.
 */
const RPC_TIMEOUT_MS = 30_000; // 30s timeout for wallet-rpc calls

async function walletRpc(
  method: string,
  params: Record<string, unknown> = {}
): Promise<unknown> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (RPC_USER) {
    const credentials = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString("base64");
    headers["Authorization"] = `Basic ${credentials}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

  try {
    const res = await fetch(WALLET_RPC_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "0",
        method,
        params,
      }),
      signal: controller.signal,
    });

    const json = await res.json();
    if (json.error) {
      throw new Error(`Monero RPC error: ${json.error.message}`);
    }
    return json.result;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Monero RPC timeout after ${RPC_TIMEOUT_MS}ms: ${method}`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function createMoneroProvider(): ChainProvider {
  return {
    chain: "monero",

    async generateAddress(derivationIndex: number): Promise<GeneratedAddress> {
      // Create a new subaddress in account 0
      // The derivationIndex is used as a label but Monero manages its own indices
      const result = (await walletRpc("create_address", {
        account_index: 0,
        label: `payment_${derivationIndex}`,
      })) as { address: string; address_index: number };

      return { address: result.address };
    },

    async checkPayment(
      address: string,
    ): Promise<PaymentCheck | null> {
      // Get all incoming transfers to this subaddress
      const result = (await walletRpc("get_transfers", {
        in: true,
        pending: true,
        pool: true,
        filter_by_height: false,
        account_index: 0,
      })) as {
        in?: Array<{
          txid: string;
          amount: number;
          address: string;
          confirmations: number;
          timestamp: number;
        }>;
        pending?: Array<{
          txid: string;
          amount: number;
          address: string;
          timestamp: number;
        }>;
        pool?: Array<{
          txid: string;
          amount: number;
          address: string;
          timestamp: number;
        }>;
      };

      // Check confirmed transfers
      const incomingTx = result.in?.find((tx) => tx.address === address);
      if (incomingTx) {
        return {
          txHash: incomingTx.txid,
          amount: incomingTx.amount / 1e12, // piconero to XMR
          confirmations: incomingTx.confirmations,
          from: "unknown", // Monero doesn't reveal sender
          timestamp: incomingTx.timestamp,
        };
      }

      // Check pending (mempool) transfers
      const pendingTx = result.pending?.find((tx) => tx.address === address);
      if (pendingTx) {
        return {
          txHash: pendingTx.txid,
          amount: pendingTx.amount / 1e12,
          confirmations: 0,
          from: "unknown",
          timestamp: pendingTx.timestamp,
        };
      }

      // Check pool transfers
      const poolTx = result.pool?.find((tx) => tx.address === address);
      if (poolTx) {
        return {
          txHash: poolTx.txid,
          amount: poolTx.amount / 1e12,
          confirmations: 0,
          from: "unknown",
          timestamp: poolTx.timestamp,
        };
      }

      return null;
    },

    async getConfirmations(txHash: string): Promise<number> {
      // Get transfer by txid
      const result = (await walletRpc("get_transfer_by_txid", {
        txid: txHash,
      })) as {
        transfer: {
          confirmations: number;
        };
      };

      return result.transfer?.confirmations || 0;
    },

    getRequiredConfirmations(): number {
      return REQUIRED_CONFIRMATIONS;
    },

    validateAddress(address: string): boolean {
      // Monero primary addresses: 95 chars starting with 4
      // Subaddresses: 95 chars starting with 8
      return /^[48][1-9A-HJ-NP-Za-km-z]{94}$/.test(address);
    },

    getExplorerUrl(txHash: string): string {
      return `https://xmrchain.net/tx/${txHash}`;
    },

    async getBalance(address: string): Promise<number> {
      const result = (await walletRpc("get_balance", {
        account_index: 0,
        all_accounts: false,
      })) as {
        balance: number;
        unlocked_balance: number;
        per_subaddress?: Array<{
          address: string;
          unlocked_balance: number;
        }>;
      };

      const sub = result.per_subaddress?.find((s) => s.address === address);
      return (sub?.unlocked_balance ?? result.unlocked_balance) / 1e12;
    },

    async send(params: {
      fromIndex: number;
      toAddress: string;
      amount: number;
      tokenContract?: string;
    }): Promise<{ txHash: string; fee: number }> {
      const amountPiconero = Math.round(params.amount * 1e12);

      const result = (await walletRpc("transfer", {
        destinations: [{ amount: amountPiconero, address: params.toAddress }],
        account_index: 0,
        priority: 1,
        ring_size: 16,
        get_tx_key: true,
      })) as { tx_hash: string; fee: number };

      return {
        txHash: result.tx_hash,
        fee: result.fee / 1e12,
      };
    },

    async estimateFee(): Promise<number> {
      try {
        const result = (await walletRpc("estimate_tx_fees", {
          grace_blocks: 5,
        })) as { fees?: number[]; fee?: number };

        if (result.fees?.[0]) return result.fees[0] / 1e12;
        if (result.fee) return result.fee / 1e12;
      } catch { /* fall through */ }

      return 0.00004;
    },
  };
}
