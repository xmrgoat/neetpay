import * as bitcoin from "bitcoinjs-lib";
import { getMnemonic } from "@/lib/wallet/hd-wallet";
import type { ChainProvider, PaymentCheck, GeneratedAddress } from "./types";

// ─── Network parameters ─────────────────────────────────────────────────────

/** BIP-44 coin types: LTC = 2, DOGE = 3 */
type CoinType = "litecoin" | "dogecoin";

interface CoinConfig {
  chain: CoinType;
  bcyChain: string;            // BlockCypher chain path (ltc/main, doge/main)
  bip44CoinType: number;       // BIP-44 coin type
  network: bitcoin.Network;    // bitcoinjs network params
  confirmations: number;
  explorer: string;
  satsPerUnit: number;
}

// Litecoin mainnet params (p2wpkh bech32 prefix "ltc")
const LITECOIN_NETWORK: bitcoin.Network = {
  messagePrefix: "\x19Litecoin Signed Message:\n",
  bech32: "ltc",
  bip32: { public: 0x04b24746, private: 0x04b2430c }, // Ltub / Ltpv (BIP-84)
  pubKeyHash: 0x30,   // L or M addresses
  scriptHash: 0x32,
  wif: 0xb0,
};

// Dogecoin mainnet params (no native segwit — use p2pkh)
const DOGECOIN_NETWORK: bitcoin.Network = {
  messagePrefix: "\x19Dogecoin Signed Message:\n",
  bech32: "doge",              // not used, DOGE doesn't have real bech32
  bip32: { public: 0x02facafd, private: 0x02fac398 },
  pubKeyHash: 0x1e,   // D addresses
  scriptHash: 0x16,
  wif: 0x9e,
};

const COIN_CONFIGS: Record<CoinType, CoinConfig> = {
  litecoin: {
    chain: "litecoin",
    bcyChain: "ltc/main",
    bip44CoinType: 2,
    network: LITECOIN_NETWORK,
    confirmations: 6,
    explorer: "https://litecoinspace.org/tx",
    satsPerUnit: 100_000_000,
  },
  dogecoin: {
    chain: "dogecoin",
    bcyChain: "doge/main",
    bip44CoinType: 3,
    network: DOGECOIN_NETWORK,
    confirmations: 6,
    explorer: "https://dogechain.info/tx",
    satsPerUnit: 100_000_000,
  },
};

// ─── BlockCypher REST helpers ────────────────────────────────────────────────

const BCY_BASE = "https://api.blockcypher.com/v1";

function getToken(): string {
  return process.env.BLOCKCYPHER_TOKEN ?? "";
}

function tokenParam(): string {
  const t = getToken();
  return t ? `?token=${t}` : "";
}

interface BCYChainInfo {
  height: number;
  high_fee_per_kb: number;
  medium_fee_per_kb: number;
  low_fee_per_kb: number;
}

interface BCYTxRef {
  tx_hash: string;
  tx_output_n: number;
  value: number;           // in satoshis
  confirmations: number;
  block_height: number;
  spent: boolean;
}

interface BCYAddrFull {
  address: string;
  balance: number;
  unconfirmed_balance: number;
  final_balance: number;
  txrefs?: BCYTxRef[];
}

interface BCYTx {
  hash: string;
  confirmations: number;
  block_height: number;
  received: string;
  total: number;
  inputs: Array<{ addresses?: string[] }>;
}

async function bcyFetch<T>(chain: string, path: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const token = getToken();
  const url = `${BCY_BASE}/${chain}${path}${token ? `${sep}token=${token}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`BlockCypher ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

async function bcyPost<T>(chain: string, path: string, body: unknown): Promise<T> {
  const token = getToken();
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BCY_BASE}/${chain}${path}${token ? `${sep}token=${token}` : ""}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`BlockCypher POST ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// ─── Key derivation ──────────────────────────────────────────────────────────

async function deriveKeypair(
  coinType: number,
  network: bitcoin.Network,
  index: number,
  useLegacy: boolean,
): Promise<{
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  address: string;
}> {
  const { mnemonicToSeedSync } = await import("@scure/bip39");
  const { HDKey } = await import("@scure/bip32");

  const mnemonic = await getMnemonic();
  const seed = mnemonicToSeedSync(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed);

  // BIP-84 for segwit coins (LTC), BIP-44 for legacy (DOGE)
  const purpose = useLegacy ? 44 : 84;
  const derived = hdKey.derive(`m/${purpose}'/${coinType}'/0'/0/${index}`);
  if (!derived.privateKey || !derived.publicKey) {
    throw new Error("Failed to derive keypair");
  }

  let address: string;
  if (useLegacy) {
    // P2PKH (Dogecoin)
    const payment = bitcoin.payments.p2pkh({
      pubkey: Buffer.from(derived.publicKey),
      network,
    });
    address = payment.address!;
  } else {
    // P2WPKH (Litecoin native segwit)
    const payment = bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(derived.publicKey),
      network,
    });
    address = payment.address!;
  }

  return { privateKey: derived.privateKey, publicKey: derived.publicKey, address };
}

// ─── Provider factory ────────────────────────────────────────────────────────

export function createBlockCypherProvider(coin: CoinType): ChainProvider {
  const cfg = COIN_CONFIGS[coin];
  const useLegacy = coin === "dogecoin"; // DOGE = p2pkh, LTC = p2wpkh

  return {
    chain: cfg.chain,

    async generateAddress(derivationIndex: number): Promise<GeneratedAddress> {
      const { address } = await deriveKeypair(
        cfg.bip44CoinType, cfg.network, derivationIndex, useLegacy,
      );
      return { address };
    },

    async checkPayment(address: string): Promise<PaymentCheck | null> {
      try {
        const data = await bcyFetch<BCYAddrFull>(
          cfg.bcyChain, `/addrs/${address}/full?limit=5`,
        );

        if (!data.txrefs || data.txrefs.length === 0) {
          if (data.final_balance <= 0) return null;
        }

        // Find first unspent UTXO
        const utxo = data.txrefs?.find((t) => !t.spent);
        if (!utxo && data.final_balance <= 0) return null;

        const amount = data.final_balance / cfg.satsPerUnit;
        const confirmations = utxo?.confirmations ?? 0;

        return {
          txHash: utxo?.tx_hash ?? "",
          amount,
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
        const tx = await bcyFetch<BCYTx>(cfg.bcyChain, `/txs/${txHash}`);
        return tx.confirmations ?? 0;
      } catch {
        return 0;
      }
    },

    getRequiredConfirmations(): number {
      return cfg.confirmations;
    },

    validateAddress(address: string): boolean {
      try {
        bitcoin.address.toOutputScript(address, cfg.network);
        return true;
      } catch {
        return false;
      }
    },

    getExplorerUrl(txHash: string): string {
      return `${cfg.explorer}/${txHash}`;
    },

    async getBalance(address: string): Promise<number> {
      try {
        const data = await bcyFetch<{ final_balance: number }>(
          cfg.bcyChain, `/addrs/${address}/balance`,
        );
        return data.final_balance / cfg.satsPerUnit;
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
        throw new Error(`${coin} does not support token transfers`);
      }

      const { privateKey, publicKey, address: fromAddress } = await deriveKeypair(
        cfg.bip44CoinType, cfg.network, params.fromIndex, useLegacy,
      );

      // Fetch UTXOs via BlockCypher
      const addrData = await bcyFetch<BCYAddrFull>(
        cfg.bcyChain, `/addrs/${fromAddress}?unspentOnly=true`,
      );

      const utxos = addrData.txrefs?.filter((t) => !t.spent) ?? [];
      if (utxos.length === 0) throw new Error("No UTXOs available");

      const sendSats = BigInt(Math.round(params.amount * cfg.satsPerUnit));

      // Get fee rate
      const chainInfo = await bcyFetch<BCYChainInfo>(cfg.bcyChain, "");
      const feePerKB = chainInfo.medium_fee_per_kb || 10000;
      const feeRatePerByte = Math.ceil(feePerKB / 1000);

      // Select UTXOs
      const sorted = [...utxos].sort((a, b) => b.value - a.value);
      const selected: BCYTxRef[] = [];
      let totalInput = 0n;

      for (const utxo of sorted) {
        selected.push(utxo);
        totalInput += BigInt(utxo.value);
        // Rough vsize estimate
        const vSize = useLegacy
          ? (10 + selected.length * 148 + 2 * 34)   // legacy p2pkh
          : (11 + selected.length * 68 + 2 * 31);   // segwit p2wpkh
        if (totalInput >= sendSats + BigInt(vSize * feeRatePerByte)) break;
      }

      const vSize = useLegacy
        ? (10 + selected.length * 148 + 2 * 34)
        : (11 + selected.length * 68 + 2 * 31);
      const feeSats = BigInt(vSize * feeRatePerByte);

      if (totalInput < sendSats + feeSats) {
        throw new Error("Insufficient funds for transaction + fee");
      }

      const changeSats = totalInput - sendSats - feeSats;

      // Build transaction
      const psbt = new bitcoin.Psbt({ network: cfg.network });

      if (useLegacy) {
        // P2PKH inputs need nonWitnessUtxo (full prev tx hex)
        const p2pkh = bitcoin.payments.p2pkh({
          pubkey: Buffer.from(publicKey),
          network: cfg.network,
        });

        for (const utxo of selected) {
          // Fetch the full previous transaction hex from BlockCypher
          let rawTxHex: string | null = null;
          try {
            const txData = await bcyFetch<{ hex: string }>(
              cfg.bcyChain, `/txs/${utxo.tx_hash}?includeHex=true`,
            );
            if (txData.hex) rawTxHex = txData.hex;
          } catch { /* fallback below */ }

          if (rawTxHex) {
            psbt.addInput({
              hash: utxo.tx_hash,
              index: utxo.tx_output_n,
              nonWitnessUtxo: Buffer.from(rawTxHex, "hex"),
            });
          } else {
            // Fallback: construct a minimal nonWitnessUtxo-less input
            // by wrapping P2PKH in a P2SH-like structure that bitcoinjs accepts
            psbt.addInput({
              hash: utxo.tx_hash,
              index: utxo.tx_output_n,
              witnessUtxo: {
                script: p2pkh.output!,
                value: BigInt(utxo.value),
              },
              // sighashType for legacy compatibility
              sighashType: bitcoin.Transaction.SIGHASH_ALL,
            });
          }
        }
      } else {
        // P2WPKH (LTC segwit)
        const p2wpkh = bitcoin.payments.p2wpkh({
          pubkey: Buffer.from(publicKey),
          network: cfg.network,
        });

        for (const utxo of selected) {
          psbt.addInput({
            hash: utxo.tx_hash,
            index: utxo.tx_output_n,
            witnessUtxo: {
              script: p2wpkh.output!,
              value: BigInt(utxo.value),
            },
          });
        }
      }

      psbt.addOutput({ address: params.toAddress, value: sendSats });
      const dustLimit = useLegacy ? 100000n : 546n;
      if (changeSats > dustLimit) {
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
      const rawTx = psbt.extractTransaction().toHex();

      // Broadcast via BlockCypher
      const result = await bcyPost<{ tx: { hash: string } }>(
        cfg.bcyChain, "/txs/push", { tx: rawTx },
      );

      return { txHash: result.tx.hash, fee: Number(feeSats) / cfg.satsPerUnit };
    },

    async estimateFee(): Promise<number> {
      try {
        const chainInfo = await bcyFetch<BCYChainInfo>(cfg.bcyChain, "");
        const feePerKB = chainInfo.medium_fee_per_kb || 10000;
        const estimatedVSize = useLegacy ? 226 : 140; // 1-in 2-out typical
        return (estimatedVSize * Math.ceil(feePerKB / 1000)) / cfg.satsPerUnit;
      } catch {
        return useLegacy ? 0.01 : 0.0001; // safe fallback
      }
    },
  };
}
