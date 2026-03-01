import { CHAIN_REGISTRY } from "@/lib/chains/registry";
import type {
  SwapProvider,
  SwapQuote,
  SwapExecution,
  SwapStatusResponse,
  SwapStatus,
} from "./types";

// ─── Config ──────────────────────────────────────────────────────────────────

const API_BASE = "https://api.1inch.dev/fusion";
const API_KEY = process.env.ONEINCH_API_KEY || "";
const NATIVE_TOKEN = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

const EVM_CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  polygon: 137,
  bsc: 56,
  arbitrum: 42161,
  optimism: 10,
  avalanche: 43114,
  base: 8453,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveToken(registryKey: string): { chainId: number; address: string; decimals: number } | null {
  const entry = CHAIN_REGISTRY[registryKey];
  if (!entry) return null;
  const chainId = EVM_CHAIN_IDS[entry.chain];
  if (!chainId) return null;
  return {
    chainId,
    address: entry.tokenContract || NATIVE_TOKEN,
    decimals: entry.tokenContract ? (entry.symbol === "USDT" || entry.symbol === "USDC" ? 6 : 18) : 18,
  };
}

function getEvmRegistryKeys(): string[] {
  return Object.keys(CHAIN_REGISTRY).filter((key) => {
    const entry = CHAIN_REGISTRY[key];
    return !!EVM_CHAIN_IDS[entry.chain];
  });
}

async function inchRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!API_KEY) throw new Error("ONEINCH_API_KEY is not configured");

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`1inch ${method} ${path} failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

// ─── Quote cache ─────────────────────────────────────────────────────────────

interface CachedOneInchQuote {
  chainId: number;
  fromToken: string;
  toToken: string;
  fromDecimals: number;
  toDecimals: number;
  amountWei: string;
  settleAmountWei: string;
  fromKey: string;
  toKey: string;
  depositAmount: string;
  settleAmount: string;
  rate: string;
  expiresAt: number;
  quoteData: unknown;
}

const quoteCache = new Map<string, CachedOneInchQuote>();
const orderChainMap = new Map<string, number>(); // orderHash → chainId

function cleanExpiredQuotes() {
  const now = Date.now();
  for (const [id, q] of quoteCache) {
    if (q.expiresAt < now) quoteCache.delete(id);
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function createOneInchProvider(): SwapProvider {
  return {
    name: "oneinch",

    getSupportedAssets(): string[] {
      return getEvmRegistryKeys();
    },

    supportsRoute(fromKey: string, toKey: string): boolean {
      if (!API_KEY) return false;
      const from = resolveToken(fromKey);
      const to = resolveToken(toKey);
      return !!from && !!to && from.chainId === to.chainId && fromKey !== toKey;
    },

    async getQuote(opts): Promise<SwapQuote> {
      const from = resolveToken(opts.fromKey);
      const to = resolveToken(opts.toKey);
      if (!from || !to || from.chainId !== to.chainId) {
        throw new Error(`Unsupported 1inch pair: ${opts.fromKey} → ${opts.toKey}`);
      }

      const amountWei = BigInt(Math.round(parseFloat(opts.amount) * 10 ** from.decimals)).toString();

      const params = new URLSearchParams({
        fromTokenAddress: from.address,
        toTokenAddress: to.address,
        amount: amountWei,
      });

      const data = await inchRequest<{
        toTokenAmount: string;
        feeToken: string;
        fromTokenAmount: string;
        protocols: unknown;
        estimatedGas: number;
      }>("GET", `/quoter/v2.0/${from.chainId}/quote?${params.toString()}`);

      const settleRaw = BigInt(data.toTokenAmount);
      const settleAmount = (Number(settleRaw) / 10 ** to.decimals).toFixed(8);
      const rate = (Number(settleRaw) / Number(BigInt(amountWei)) * (10 ** from.decimals / 10 ** to.decimals)).toFixed(8);

      const quoteId = `1i_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5min

      quoteCache.set(quoteId, {
        chainId: from.chainId,
        fromToken: from.address,
        toToken: to.address,
        fromDecimals: from.decimals,
        toDecimals: to.decimals,
        amountWei,
        settleAmountWei: data.toTokenAmount,
        fromKey: opts.fromKey,
        toKey: opts.toKey,
        depositAmount: opts.amount,
        settleAmount,
        rate,
        expiresAt,
        quoteData: data,
      });
      cleanExpiredQuotes();

      return {
        provider: "oneinch",
        quoteId,
        fromAsset: opts.fromKey,
        toAsset: opts.toKey,
        depositAmount: opts.amount,
        settleAmount,
        rate,
        expiresAt: new Date(expiresAt).toISOString(),
        fees: {
          network: data.estimatedGas?.toString() ?? "0",
          protocol: "0",
        },
      };
    },

    async executeSwap(opts): Promise<SwapExecution> {
      const cached = quoteCache.get(opts.quoteId);
      if (!cached) throw new Error("Quote expired or not found");

      if (cached.expiresAt < Date.now()) {
        quoteCache.delete(opts.quoteId);
        throw new Error("Quote expired");
      }

      // Create Fusion order
      // The settle address receives the swapped tokens
      const orderData = await inchRequest<{
        orderHash: string;
        order: unknown;
      }>("POST", `/relayer/v2.0/${cached.chainId}/order`, {
        fromTokenAddress: cached.fromToken,
        toTokenAddress: cached.toToken,
        amount: cached.amountWei,
        walletAddress: opts.settleAddress,
        receiver: opts.settleAddress,
      });

      // Store chainId for status lookups
      orderChainMap.set(orderData.orderHash, cached.chainId);

      return {
        provider: "oneinch",
        swapId: orderData.orderHash,
        depositAddress: opts.settleAddress,
        depositAmount: cached.depositAmount,
        settleAmount: cached.settleAmount,
        rate: cached.rate,
        status: "pending",
        expiresAt: new Date(cached.expiresAt).toISOString(),
      };
    },

    async getStatus(swapId: string): Promise<SwapStatusResponse> {
      const chainId = orderChainMap.get(swapId);
      if (!chainId) {
        throw new Error("Order not found — chainId not in local cache");
      }

      const data = await inchRequest<{
        orderHash: string;
        status: string;
        takerAmount?: string;
      }>("GET", `/relayer/v2.0/${chainId}/order/status/${swapId}`);

      const statusMap: Record<string, SwapStatus> = {
        pending: "pending",
        filling: "processing",
        filled: "complete",
        expired: "expired",
        cancelled: "failed",
      };

      return {
        swapId,
        provider: "oneinch",
        status: statusMap[data.status] ?? "processing",
        depositAmount: "",
        settleAmount: data.takerAmount ?? "",
      };
    },
  };
}
