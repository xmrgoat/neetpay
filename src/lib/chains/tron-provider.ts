import { getMnemonic } from "@/lib/wallet/hd-wallet";
import type { ChainProvider, PaymentCheck, GeneratedAddress } from "./types";

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY || "";
const RPC_URL = `https://tron-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;
const REQUIRED_CONFIRMATIONS = 20;

// USDT TRC-20 contract on TRON mainnet
const USDT_TRC20 = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

/**
 * Call Alchemy Tron JSON-RPC (full node API).
 */
async function tronRpc(
  path: string,
  body?: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch(`${RPC_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

/**
 * Derive a TRON address from mnemonic.
 * BIP-44 path: m/44'/195'/0'/0/{index}
 */
async function deriveTronPrivateKey(index: number): Promise<string> {
  const { mnemonicToSeedSync } = await import("@scure/bip39");
  const { HDKey } = await import("@scure/bip32");

  const mnemonic = await getMnemonic();
  const seed = mnemonicToSeedSync(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed);
  const derived = hdKey.derive(`m/44'/195'/0'/0/${index}`);
  if (!derived.privateKey) throw new Error("Failed to derive TRON private key");
  return Buffer.from(derived.privateKey).toString("hex");
}

async function deriveTronAddress(
  index: number
): Promise<{ address: string; hexAddress: string }> {
  const { mnemonicToSeedSync } = await import("@scure/bip39");
  const { HDKey } = await import("@scure/bip32");
  const TronWeb = (await import("tronweb")).default;

  const mnemonic = await getMnemonic();
  const seed = mnemonicToSeedSync(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed);

  const derived = hdKey.derive(`m/44'/195'/0'/0/${index}`);
  if (!derived.privateKey) {
    throw new Error("Failed to derive TRON private key");
  }

  const privateKeyHex = Buffer.from(derived.privateKey).toString("hex");
  const address = (TronWeb as any).address.fromPrivateKey(privateKeyHex);

  if (!address) throw new Error("Failed to generate TRON address");

  return {
    address,
    hexAddress: (TronWeb as any).address.toHex(address),
  };
}

export function createTronProvider(): ChainProvider {
  return {
    chain: "tron",

    async generateAddress(derivationIndex: number): Promise<GeneratedAddress> {
      const { address } = await deriveTronAddress(derivationIndex);
      return { address };
    },

    async checkPayment(
      address: string,
      expectedAmount?: number,
      tokenContract?: string
    ): Promise<PaymentCheck | null> {
      const TronWeb = (await import("tronweb")).default;
      const hexAddress = (TronWeb as any).address.toHex(address);

      if (tokenContract) {
        // TRC-20 token transfer check
        const result = (await tronRpc(
          "/v1/accounts/" + address + "/transactions/trc20",
          { contract_address: tokenContract, only_to: true, limit: 1 }
        )) as {
          data?: Array<{
            transaction_id: string;
            value: string;
            from: string;
            block_timestamp: number;
            token_info: { decimals: number };
          }>;
        };

        if (!result.data || result.data.length === 0) return null;

        const tx = result.data[0];
        const decimals = tx.token_info?.decimals || 6;
        const amount = parseInt(tx.value) / Math.pow(10, decimals);

        // Get current block for confirmation count
        const block = (await tronRpc("/wallet/getnowblock")) as {
          block_header: { raw_data: { number: number } };
        };

        const txInfo = (await tronRpc("/wallet/gettransactioninfobyid", {
          value: tx.transaction_id,
        })) as { blockNumber?: number };

        const confirmations = txInfo.blockNumber
          ? block.block_header.raw_data.number - txInfo.blockNumber
          : 0;

        return {
          txHash: tx.transaction_id,
          amount,
          confirmations,
          from: tx.from,
          timestamp: Math.floor(tx.block_timestamp / 1000),
          tokenContract,
        };
      } else {
        // Native TRX balance check
        const account = (await tronRpc("/wallet/getaccount", {
          address: hexAddress,
          visible: false,
        })) as { balance?: number };

        if (!account.balance || account.balance === 0) return null;

        const amount = account.balance / 1_000_000; // TRX has 6 decimals (sun)

        return {
          txHash: "",
          amount,
          confirmations: REQUIRED_CONFIRMATIONS,
          from: "unknown",
          timestamp: Math.floor(Date.now() / 1000),
        };
      }
    },

    async getConfirmations(txHash: string): Promise<number> {
      const txInfo = (await tronRpc("/wallet/gettransactioninfobyid", {
        value: txHash,
      })) as { blockNumber?: number };

      if (!txInfo.blockNumber) return 0;

      const block = (await tronRpc("/wallet/getnowblock")) as {
        block_header: { raw_data: { number: number } };
      };

      return block.block_header.raw_data.number - txInfo.blockNumber;
    },

    getRequiredConfirmations(): number {
      return REQUIRED_CONFIRMATIONS;
    },

    validateAddress(address: string): boolean {
      // TRON addresses start with T and are 34 chars (base58)
      return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
    },

    getExplorerUrl(txHash: string): string {
      return `https://tronscan.org/#/transaction/${txHash}`;
    },

    async getBalance(address: string, tokenContract?: string): Promise<number> {
      const TronWebModule = (await import("tronweb")).default;
      const TronWeb = TronWebModule as any;

      if (tokenContract) {
        const tronWeb = new TronWeb({ fullHost: RPC_URL });
        const contract = await tronWeb.contract().at(tokenContract);
        const rawBalance = await contract.methods.balanceOf(address).call();
        const decimalsRaw = await contract.methods.decimals().call();
        return Number(rawBalance) / Math.pow(10, Number(decimalsRaw));
      }

      const hexAddress = (TronWeb as any).address.toHex(address);
      const account = (await tronRpc("/wallet/getaccount", {
        address: hexAddress,
        visible: false,
      })) as { balance?: number };
      return (account.balance || 0) / 1_000_000;
    },

    async send(params: {
      fromIndex: number;
      toAddress: string;
      amount: number;
      tokenContract?: string;
    }): Promise<{ txHash: string; fee: number }> {
      const TronWebModule = (await import("tronweb")).default;
      const TronWeb = TronWebModule as any;
      const privateKey = await deriveTronPrivateKey(params.fromIndex);
      const tronWeb = new TronWeb({ fullHost: RPC_URL, privateKey });

      if (params.tokenContract) {
        const contract = await tronWeb.contract().at(params.tokenContract);
        const decimalsRaw = await contract.methods.decimals().call();
        const rawAmount = BigInt(Math.round(params.amount * Math.pow(10, Number(decimalsRaw))));

        const { transaction } = await tronWeb.transactionBuilder.triggerSmartContract(
          params.tokenContract,
          "transfer(address,uint256)",
          { feeLimit: 100_000_000 },
          [
            { type: "address", value: params.toAddress },
            { type: "uint256", value: rawAmount.toString() },
          ],
        );

        const signed = await tronWeb.trx.sign(transaction, privateKey);
        const broadcast = await tronWeb.trx.sendRawTransaction(signed);

        if (!broadcast.result) {
          throw new Error(`TRON TRC-20 broadcast failed: ${broadcast.code || "unknown"}`);
        }
        return { txHash: broadcast.txid, fee: 15 };
      }

      const amountSun = Math.round(params.amount * 1_000_000);
      const transaction = await tronWeb.transactionBuilder.sendTrx(
        params.toAddress,
        amountSun,
      );
      const signed = await tronWeb.trx.sign(transaction, privateKey);
      const broadcast = await tronWeb.trx.sendRawTransaction(signed);

      if (!broadcast.result) {
        throw new Error(`TRON broadcast failed: ${broadcast.code || "unknown"}`);
      }
      return { txHash: broadcast.txid, fee: 1.1 };
    },

    async estimateFee(
      _toAddress: string,
      _amount: number,
      tokenContract?: string,
    ): Promise<number> {
      return tokenContract ? 15 : 1.1;
    },
  };
}

export { USDT_TRC20 };
