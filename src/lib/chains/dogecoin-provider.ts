import * as bitcoin from "bitcoinjs-lib";
import { getMnemonic } from "@/lib/wallet/hd-wallet";
import type { ChainProvider, PaymentCheck, GeneratedAddress } from "./types";

// ─── Config ──────────────────────────────────────────────────────────────────

const RPC_URL = process.env.DOGECOIN_RPC_URL || "http://localhost:22555";
const RPC_USER = process.env.DOGECOIN_RPC_USER || "";
const RPC_PASS = process.env.DOGECOIN_RPC_PASSWORD || "";
const REQUIRED_CONFIRMATIONS = 6;
const SATS_PER_DOGE = 100_000_000;
const DUST_LIMIT = 100_000n; // 0.001 DOGE

// Dogecoin mainnet network params (P2PKH legacy, no native segwit)
const DOGECOIN_NETWORK: bitcoin.Network = {
  messagePrefix: "\x19Dogecoin Signed Message:\n",
  bech32: "doge",
  bip32: { public: 0x02facafd, private: 0x02fac398 },
  pubKeyHash: 0x1e,
  scriptHash: 0x16,
  wif: 0x9e,
};

// ─── JSON-RPC helper ─────────────────────────────────────────────────────────

async function dogeRpc(method: string, params: unknown[] = []): Promise<unknown> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (RPC_USER) {
    headers["Authorization"] = `Basic ${Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString("base64")}`;
  }

  const res = await fetch(RPC_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

// ─── Key derivation (BIP-44, coin type 3, P2PKH) ────────────────────────────

async function dogeKeypair(index: number): Promise<{
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  address: string;
}> {
  const { mnemonicToSeedSync } = await import("@scure/bip39");
  const { HDKey } = await import("@scure/bip32");

  const mnemonic = await getMnemonic();
  const seed = mnemonicToSeedSync(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed);

  const derived = hdKey.derive(`m/44'/3'/0'/0/${index}`);
  if (!derived.privateKey || !derived.publicKey) {
    throw new Error("Failed to derive DOGE keypair");
  }

  const payment = bitcoin.payments.p2pkh({
    pubkey: Buffer.from(derived.publicKey),
    network: DOGECOIN_NETWORK,
  });

  if (!payment.address) throw new Error("Failed to generate DOGE address");

  return { privateKey: derived.privateKey, publicKey: derived.publicKey, address: payment.address };
}

async function dogeAddress(index: number): Promise<string> {
  const { address } = await dogeKeypair(index);
  return address;
}

async function getFeeRate(targetBlocks = 6): Promise<number> {
  try {
    const result = (await dogeRpc("estimatesmartfee", [targetBlocks])) as {
      feerate?: number;
    };
    if (result.feerate && result.feerate > 0) {
      return Math.ceil((result.feerate * SATS_PER_DOGE) / 1000);
    }
  } catch { /* fall through */ }
  return 100; // safe default for DOGE (higher base fees)
}

// ─── UTXO scanning with scantxoutset fallback ────────────────────────────────

async function scanUtxos(address: string): Promise<{
  total: number;
  unspents: Array<{ txid: string; vout: number; amount: number; height: number }>;
} | null> {
  // Try scantxoutset first (Dogecoin Core 1.21+)
  try {
    const result = await dogeRpc("scantxoutset", [
      "start",
      [`addr(${address})`],
    ]) as {
      success: boolean;
      total_amount: number;
      unspents: Array<{ txid: string; vout: number; amount: number; height: number }>;
    };
    if (result?.success) {
      return { total: result.total_amount, unspents: result.unspents };
    }
  } catch { /* fallback below */ }

  // Fallback: importaddress + listunspent
  try {
    try {
      await dogeRpc("importaddress", [address, "", false]);
    } catch { /* already imported */ }

    const utxos = (await dogeRpc("listunspent", [0, 9999999, [address]])) as Array<{
      txid: string;
      vout: number;
      amount: number;
      confirmations: number;
    }>;

    if (utxos.length === 0) return null;

    const total = utxos.reduce((sum, u) => sum + u.amount, 0);
    return {
      total,
      unspents: utxos.map((u) => ({
        txid: u.txid,
        vout: u.vout,
        amount: u.amount,
        height: 0, // not available from listunspent
      })),
    };
  } catch {
    return null;
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function createDogecoinProvider(): ChainProvider {
  return {
    chain: "dogecoin",

    async generateAddress(derivationIndex: number): Promise<GeneratedAddress> {
      const address = await dogeAddress(derivationIndex);
      return { address };
    },

    async checkPayment(address: string): Promise<PaymentCheck | null> {
      try {
        const result = await scanUtxos(address);
        if (!result || result.unspents.length === 0) return null;

        // Use the most recent UTXO so txHash and confirmations reflect the latest deposit
        const sorted = [...result.unspents].sort((a, b) => b.height - a.height);
        const latest = sorted.find((u) => u.height > 0) ?? sorted[0];

        // Get confirmation count
        let confirmations = 0;
        if (latest.height > 0) {
          const blockCount = (await dogeRpc("getblockcount")) as number;
          confirmations = blockCount - latest.height + 1;
        } else {
          // Fallback: get confirmations from tx directly
          try {
            const tx = (await dogeRpc("getrawtransaction", [latest.txid, true])) as {
              confirmations?: number;
            };
            confirmations = tx.confirmations || 0;
          } catch { /* 0 confirmations */ }
        }

        return {
          txHash: latest.txid,
          amount: result.total,
          confirmations,
          from: "unknown",
          timestamp: Math.floor(Date.now() / 1000),
        };
      } catch {
        return null;
      }
    },

    async getConfirmations(txHash: string): Promise<number> {
      try {
        const tx = (await dogeRpc("getrawtransaction", [
          txHash,
          true,
        ])) as { confirmations?: number };
        return tx.confirmations || 0;
      } catch {
        return 0;
      }
    },

    getRequiredConfirmations(): number {
      return REQUIRED_CONFIRMATIONS;
    },

    validateAddress(address: string): boolean {
      try {
        bitcoin.address.toOutputScript(address, DOGECOIN_NETWORK);
        return true;
      } catch {
        return false;
      }
    },

    getExplorerUrl(txHash: string): string {
      return `https://dogechain.info/tx/${txHash}`;
    },

    async getBalance(address: string): Promise<number> {
      try {
        const result = await scanUtxos(address);
        return result?.total ?? 0;
      } catch {
        return 0;
      }
    },

    async send(params: {
      fromIndex: number;
      toAddress: string;
      amount: number;
      tokenContract?: string;
    }): Promise<{ txHash: string; fee: number }> {
      if (params.tokenContract) {
        throw new Error("Dogecoin does not support token transfers");
      }

      const { privateKey, publicKey, address: fromAddress } =
        await dogeKeypair(params.fromIndex);

      const utxoResult = await scanUtxos(fromAddress);
      if (!utxoResult || utxoResult.unspents.length === 0) {
        throw new Error("No UTXOs available");
      }

      const sendSats = BigInt(Math.round(params.amount * SATS_PER_DOGE));
      const feeRateSatPerVB = await getFeeRate(6);

      // Select UTXOs (legacy vSize: 10 + inputs*148 + outputs*34)
      const sorted = [...utxoResult.unspents].sort((a, b) => b.amount - a.amount);
      const selected: typeof sorted = [];
      let totalInputSats = 0n;

      for (const utxo of sorted) {
        selected.push(utxo);
        totalInputSats += BigInt(Math.round(utxo.amount * SATS_PER_DOGE));
        const vSize = 10 + selected.length * 148 + 2 * 34;
        if (totalInputSats >= sendSats + BigInt(vSize * feeRateSatPerVB)) break;
      }

      const vSize = 10 + selected.length * 148 + 2 * 34;
      const feeSats = BigInt(vSize * feeRateSatPerVB);

      if (totalInputSats < sendSats + feeSats) {
        throw new Error("Insufficient funds for transaction + fee");
      }

      const changeSats = totalInputSats - sendSats - feeSats;

      // Build PSBT with P2PKH inputs
      const psbt = new bitcoin.Psbt({ network: DOGECOIN_NETWORK });

      const p2pkh = bitcoin.payments.p2pkh({
        pubkey: Buffer.from(publicKey),
        network: DOGECOIN_NETWORK,
      });

      for (const utxo of selected) {
        // P2PKH needs nonWitnessUtxo (full previous tx hex)
        let rawTxHex: string | null = null;
        try {
          rawTxHex = (await dogeRpc("getrawtransaction", [utxo.txid])) as string;
        } catch { /* fallback below */ }

        if (!rawTxHex) {
          throw new Error(`Cannot fetch raw tx ${utxo.txid} — required for P2PKH signing`);
        }

        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          nonWitnessUtxo: Buffer.from(rawTxHex, "hex"),
        });
      }

      psbt.addOutput({ address: params.toAddress, value: sendSats });
      if (changeSats > DUST_LIMIT) {
        psbt.addOutput({ address: fromAddress, value: changeSats });
      }

      // Sign
      const { secp256k1 } = await import("@noble/curves/secp256k1");
      const signer: bitcoin.Signer = {
        publicKey: Buffer.from(publicKey),
        sign(hash: Uint8Array): Uint8Array {
          return Buffer.from(secp256k1.sign(hash, privateKey).toCompactRawBytes());
        },
      };

      for (let i = 0; i < selected.length; i++) {
        psbt.signInput(i, signer);
      }

      psbt.finalizeAllInputs();
      const txHex = psbt.extractTransaction().toHex();
      const txHash = (await dogeRpc("sendrawtransaction", [txHex])) as string;

      return { txHash, fee: Number(feeSats) / SATS_PER_DOGE };
    },

    async estimateFee(): Promise<number> {
      const feeRateSatPerVB = await getFeeRate(6);
      const estimatedVSize = 226; // 1-in 2-out legacy P2PKH
      return (estimatedVSize * feeRateSatPerVB) / SATS_PER_DOGE;
    },
  };
}
