import * as bitcoin from "bitcoinjs-lib";
import { getMnemonic } from "@/lib/wallet/hd-wallet";
import type { ChainProvider, PaymentCheck, GeneratedAddress } from "./types";

// ─── Config ──────────────────────────────────────────────────────────────────

const RPC_URL = process.env.LITECOIN_RPC_URL || "http://localhost:9332";
const RPC_USER = process.env.LITECOIN_RPC_USER || "";
const RPC_PASS = process.env.LITECOIN_RPC_PASSWORD || "";
const REQUIRED_CONFIRMATIONS = 6;
const SATS_PER_LTC = 100_000_000;

// Litecoin mainnet network params (BIP-84 native segwit, bech32 prefix "ltc")
const LITECOIN_NETWORK: bitcoin.Network = {
  messagePrefix: "\x19Litecoin Signed Message:\n",
  bech32: "ltc",
  bip32: { public: 0x04b24746, private: 0x04b2430c },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0,
};

// ─── JSON-RPC helper ─────────────────────────────────────────────────────────

async function ltcRpc(method: string, params: unknown[] = []): Promise<unknown> {
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

// ─── Key derivation (BIP-84, coin type 2, P2WPKH) ──────────────────────────

async function deriveLtcKeypair(index: number): Promise<{
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  address: string;
}> {
  const { mnemonicToSeedSync } = await import("@scure/bip39");
  const { HDKey } = await import("@scure/bip32");

  const mnemonic = await getMnemonic();
  const seed = mnemonicToSeedSync(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed);

  const derived = hdKey.derive(`m/84'/2'/0'/0/${index}`);
  if (!derived.privateKey || !derived.publicKey) {
    throw new Error("Failed to derive LTC keypair");
  }

  const { address } = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(derived.publicKey),
    network: LITECOIN_NETWORK,
  });

  if (!address) throw new Error("Failed to generate LTC address");

  return { privateKey: derived.privateKey, publicKey: derived.publicKey, address };
}

async function deriveLtcAddress(index: number): Promise<string> {
  const { address } = await deriveLtcKeypair(index);
  return address;
}

async function getFeeRate(targetBlocks = 6): Promise<number> {
  try {
    const result = (await ltcRpc("estimatesmartfee", [targetBlocks])) as {
      feerate?: number;
    };
    if (result.feerate && result.feerate > 0) {
      return Math.ceil((result.feerate * SATS_PER_LTC) / 1000);
    }
  } catch { /* fall through */ }
  return 10;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function createLitecoinProvider(): ChainProvider {
  return {
    chain: "litecoin",

    async generateAddress(derivationIndex: number): Promise<GeneratedAddress> {
      const address = await deriveLtcAddress(derivationIndex);
      return { address };
    },

    async checkPayment(address: string): Promise<PaymentCheck | null> {
      try {
        const result = await ltcRpc("scantxoutset", [
          "start",
          [`addr(${address})`],
        ]) as {
          success: boolean;
          total_amount: number;
          unspents: Array<{
            txid: string;
            vout: number;
            amount: number;
            height: number;
          }>;
        };

        if (!result || !result.success || result.unspents.length === 0) {
          return null;
        }

        // Use the most recent UTXO (highest height, or lowest height = 0 for mempool)
        // so txHash and confirmations reflect the latest deposit
        const sorted = [...result.unspents].sort((a, b) => b.height - a.height);
        const latest = sorted.find((u) => u.height > 0) ?? sorted[0];

        const blockCount = (await ltcRpc("getblockcount")) as number;
        const confirmations = latest.height > 0 ? blockCount - latest.height + 1 : 0;

        return {
          txHash: latest.txid,
          amount: result.total_amount,
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
        const tx = (await ltcRpc("getrawtransaction", [
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
        bitcoin.address.toOutputScript(address, LITECOIN_NETWORK);
        return true;
      } catch {
        return false;
      }
    },

    getExplorerUrl(txHash: string): string {
      return `https://litecoinspace.org/tx/${txHash}`;
    },

    async getBalance(address: string): Promise<number> {
      try {
        const result = (await ltcRpc("scantxoutset", [
          "start",
          [`addr(${address})`],
        ])) as { success: boolean; total_amount: number };
        return result?.success ? result.total_amount : 0;
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
        throw new Error("Litecoin does not support token transfers");
      }

      const { privateKey, publicKey, address: fromAddress } =
        await deriveLtcKeypair(params.fromIndex);

      // Fetch UTXOs
      const utxoResult = (await ltcRpc("scantxoutset", [
        "start",
        [`addr(${fromAddress})`],
      ])) as {
        success: boolean;
        unspents: Array<{ txid: string; vout: number; amount: number; height: number }>;
      };

      if (!utxoResult?.success || utxoResult.unspents.length === 0) {
        throw new Error("No UTXOs available");
      }

      const sendSats = BigInt(Math.round(params.amount * SATS_PER_LTC));
      const feeRateSatPerVB = await getFeeRate(6);

      // Select UTXOs
      const sorted = [...utxoResult.unspents].sort((a, b) => b.amount - a.amount);
      const selected: typeof sorted = [];
      let totalInputSats = 0n;

      for (const utxo of sorted) {
        selected.push(utxo);
        totalInputSats += BigInt(Math.round(utxo.amount * SATS_PER_LTC));
        const vSize = 11 + selected.length * 68 + 2 * 31;
        if (totalInputSats >= sendSats + BigInt(vSize * feeRateSatPerVB)) break;
      }

      const vSize = 11 + selected.length * 68 + 2 * 31;
      const feeSats = BigInt(vSize * feeRateSatPerVB);

      if (totalInputSats < sendSats + feeSats) {
        throw new Error("Insufficient funds for transaction + fee");
      }

      const changeSats = totalInputSats - sendSats - feeSats;

      // Build PSBT
      const psbt = new bitcoin.Psbt({ network: LITECOIN_NETWORK });

      const p2wpkh = bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(publicKey),
        network: LITECOIN_NETWORK,
      });

      for (const utxo of selected) {
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            script: p2wpkh.output!,
            value: BigInt(Math.round(utxo.amount * SATS_PER_LTC)),
          },
        });
      }

      psbt.addOutput({ address: params.toAddress, value: sendSats });
      if (changeSats > 546n) {
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
      const txHash = (await ltcRpc("sendrawtransaction", [txHex])) as string;

      return { txHash, fee: Number(feeSats) / SATS_PER_LTC };
    },

    async estimateFee(): Promise<number> {
      const feeRateSatPerVB = await getFeeRate(6);
      return (140 * feeRateSatPerVB) / SATS_PER_LTC;
    },
  };
}
