import * as bitcoin from "bitcoinjs-lib";
import { getMnemonic } from "@/lib/wallet/hd-wallet";
import type { ChainProvider, PaymentCheck, GeneratedAddress } from "./types";

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY || "";
const RPC_URL = `https://btc-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;
const REQUIRED_CONFIRMATIONS = 3;
const SATS_PER_BTC = 100_000_000;

/**
 * Call Alchemy Bitcoin JSON-RPC.
 */
async function btcRpc(method: string, params: unknown[] = []): Promise<unknown> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

/**
 * Derive full BTC keypair (BIP-84 native segwit).
 * Path: m/84'/0'/0'/0/{index}
 */
async function deriveBtcKeypair(index: number): Promise<{
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  address: string;
}> {
  const { mnemonicToSeedSync } = await import("@scure/bip39");
  const { HDKey } = await import("@scure/bip32");

  const mnemonic = await getMnemonic();
  const seed = mnemonicToSeedSync(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed);

  const derived = hdKey.derive(`m/84'/0'/0'/0/${index}`);
  if (!derived.privateKey || !derived.publicKey) {
    throw new Error("Failed to derive BTC keypair");
  }

  const { address } = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(derived.publicKey),
    network: bitcoin.networks.bitcoin,
  });

  if (!address) throw new Error("Failed to generate BTC address");

  return { privateKey: derived.privateKey, publicKey: derived.publicKey, address };
}

async function deriveBtcAddress(index: number): Promise<string> {
  const { address } = await deriveBtcKeypair(index);
  return address;
}

async function getFeeRate(targetBlocks = 6): Promise<number> {
  try {
    const result = (await btcRpc("estimatesmartfee", [targetBlocks])) as {
      feerate?: number;
    };
    if (result.feerate && result.feerate > 0) {
      return Math.ceil((result.feerate * SATS_PER_BTC) / 1000);
    }
  } catch { /* fall through */ }
  return 10;
}

export function createBitcoinProvider(): ChainProvider {
  return {
    chain: "bitcoin",

    async generateAddress(derivationIndex: number): Promise<GeneratedAddress> {
      const address = await deriveBtcAddress(derivationIndex);
      return { address };
    },

    async checkPayment(
      address: string,
    ): Promise<PaymentCheck | null> {
      // Use Alchemy's Bitcoin RPC to scan for UTXOs
      // scantxoutset scans the UTXO set for outputs matching the address
      try {
        const result = await btcRpc("scantxoutset", [
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

        const utxo = result.unspents[0];

        // Get current block height for confirmation count
        const blockCount = (await btcRpc("getblockcount")) as number;
        const confirmations = utxo.height > 0 ? blockCount - utxo.height + 1 : 0;

        return {
          txHash: utxo.txid,
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
        const tx = (await btcRpc("getrawtransaction", [
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
        bitcoin.address.toOutputScript(address, bitcoin.networks.bitcoin);
        return true;
      } catch {
        return false;
      }
    },

    getExplorerUrl(txHash: string): string {
      return `https://mempool.space/tx/${txHash}`;
    },

    async getBalance(address: string): Promise<number> {
      try {
        const result = (await btcRpc("scantxoutset", [
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
        throw new Error("Bitcoin does not support token transfers");
      }

      const { privateKey, publicKey, address: fromAddress } =
        await deriveBtcKeypair(params.fromIndex);

      // Fetch UTXOs
      const utxoResult = (await btcRpc("scantxoutset", [
        "start",
        [`addr(${fromAddress})`],
      ])) as {
        success: boolean;
        unspents: Array<{ txid: string; vout: number; amount: number; height: number }>;
      };

      if (!utxoResult?.success || utxoResult.unspents.length === 0) {
        throw new Error("No UTXOs available");
      }

      const sendSats = BigInt(Math.round(params.amount * SATS_PER_BTC));
      const feeRateSatPerVB = await getFeeRate(6);

      const sorted = [...utxoResult.unspents].sort((a, b) => b.amount - a.amount);
      const selected: typeof sorted = [];
      let totalInputSats = 0n;

      for (const utxo of sorted) {
        selected.push(utxo);
        totalInputSats += BigInt(Math.round(utxo.amount * SATS_PER_BTC));
        const vSize = 11 + selected.length * 68 + 2 * 31;
        if (totalInputSats >= sendSats + BigInt(vSize * feeRateSatPerVB)) break;
      }

      const vSize = 11 + selected.length * 68 + 2 * 31;
      const feeSats = BigInt(vSize * feeRateSatPerVB);

      if (totalInputSats < sendSats + feeSats) {
        throw new Error("Insufficient funds for transaction + fee");
      }

      const changeSats = totalInputSats - sendSats - feeSats;

      const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });

      const p2wpkh = bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(publicKey),
        network: bitcoin.networks.bitcoin,
      });

      for (const utxo of selected) {
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            script: p2wpkh.output!,
            value: BigInt(Math.round(utxo.amount * SATS_PER_BTC)),
          },
        });
      }

      psbt.addOutput({ address: params.toAddress, value: sendSats });
      if (changeSats > 546n) {
        psbt.addOutput({ address: fromAddress, value: changeSats });
      }

      // Sign with @noble/curves
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
      const txHash = (await btcRpc("sendrawtransaction", [txHex])) as string;

      return { txHash, fee: Number(feeSats) / SATS_PER_BTC };
    },

    async estimateFee(): Promise<number> {
      const feeRateSatPerVB = await getFeeRate(6);
      return (140 * feeRateSatPerVB) / SATS_PER_BTC;
    },
  };
}
