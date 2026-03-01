import type {
  SwapProvider,
  SwapQuote,
  SwapExecution,
  SwapStatusResponse,
  SwapStatus,
} from "./types";

// ─── Config ──────────────────────────────────────────────────────────────────

const NODE_URL = process.env.THORCHAIN_NODE_URL || "https://thornode.ninerealms.com";
const AFFILIATE = process.env.THORCHAIN_AFFILIATE_ID || "np";
const AFFILIATE_BPS = process.env.THORCHAIN_AFFILIATE_FEE_BPS || "30";

// THORChain uses 8-decimal base units for all assets
const BASE_UNITS = 1e8;

// ─── Asset mapping (VoidPay registry key → THORChain notation) ───────────────

const THORCHAIN_ASSETS: Record<string, string> = {
  BTC:   "BTC.BTC",
  ETH:   "ETH.ETH",
  LTC:   "LTC.LTC",
  DOGE:  "DOGE.DOGE",
  AVAX:  "AVAX.AVAX",
  BNB:   "BSC.BNB",
  // ERC-20 tokens on ETH
  "USDT-ERC20": "ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7",
  "USDC-ERC20": "ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48",
  "DAI-ERC20":  "ETH.DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F",
  // BSC tokens
  "USDT-BSC": "BSC.USDT-0X55D398326F99059FF775485246999027B3197955",
  "USDC-BSC": "BSC.USDC-0X8AC76A51CC950D9822D68B83FE1AD97B32CD580D",
  // AVAX tokens
  "USDT-AVAX": "AVAX.USDT-0X9702230A8EA53601F5CD2DC00FDBC13D4DF4A8C7",
  "USDC-AVAX": "AVAX.USDC-0XB97EF9EF8734C71904D8002F8B6BC66DD9C48A6E",
};

function toThorAsset(registryKey: string): string | null {
  return THORCHAIN_ASSETS[registryKey] ?? null;
}

// ─── THORNode API helpers ────────────────────────────────────────────────────

async function thorRequest<T>(path: string): Promise<T> {
  const res = await fetch(`${NODE_URL}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`THORChain ${path} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}

interface ThorQuoteResponse {
  expected_amount_out: string;
  fees: {
    affiliate: string;
    asset: string;
    liquidity: string;
    outbound: string;
    total: string;
  };
  inbound_address: string;
  memo: string;
  expiry: number;
  warning: string;
  notes: string;
  recommended_min_amount_in?: string;
  max_streaming_quantity?: number;
  streaming_swap_seconds?: number;
}

interface ThorInboundAddress {
  chain: string;
  pub_key: string;
  address: string;
  halted: boolean;
  gas_rate: string;
  gas_rate_units: string;
  outbound_fee: string;
}

interface ThorTxStatus {
  tx?: {
    id: string;
    chain: string;
    from_address: string;
    to_address: string;
    coins: Array<{ asset: string; amount: string }>;
    memo: string;
  };
  stages: {
    inbound_observed?: { completed: boolean };
    inbound_confirmation_counted?: { completed: boolean; counting_since?: number; remaining_confirmation_ms?: number };
    inbound_finalised?: { completed: boolean };
    swap_finalised?: { completed: boolean };
    outbound_delay?: { completed: boolean; remaining_delay_ms?: number };
    outbound_signed?: { completed: boolean; scheduled_outbound_height?: number };
  };
  out_txs?: Array<{
    id: string;
    chain: string;
    to_address: string;
    coins: Array<{ asset: string; amount: string }>;
  }>;
}

// ─── Quote cache ─────────────────────────────────────────────────────────────

interface CachedQuote {
  inboundAddress: string;
  memo: string;
  expiry: number;
  fromAsset: string;
  toAsset: string;
  depositAmount: string;
  settleAmount: string;
  rate: string;
  fees: { network: string; protocol: string; affiliate: string };
  recommendedMin?: string;
}

const quoteCache = new Map<string, CachedQuote>();

function cleanExpiredQuotes() {
  const now = Date.now() / 1000;
  for (const [id, q] of quoteCache) {
    if (q.expiry < now) quoteCache.delete(id);
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function createThorchainProvider(): SwapProvider {
  return {
    name: "thorchain",

    getSupportedAssets(): string[] {
      return Object.keys(THORCHAIN_ASSETS);
    },

    supportsRoute(fromKey: string, toKey: string): boolean {
      return !!toThorAsset(fromKey) && !!toThorAsset(toKey) && fromKey !== toKey;
    },

    async getQuote(opts): Promise<SwapQuote> {
      const fromAsset = toThorAsset(opts.fromKey);
      const toAsset = toThorAsset(opts.toKey);
      if (!fromAsset || !toAsset) {
        throw new Error(`Unsupported THORChain pair: ${opts.fromKey} → ${opts.toKey}`);
      }

      const amountBase = Math.round(parseFloat(opts.amount) * BASE_UNITS);

      // THORNode requires a destination address for the quote.
      // Use a well-known burn address per chain as a placeholder;
      // the real address is embedded in the memo at execute time.
      const PLACEHOLDER_DESTINATIONS: Record<string, string> = {
        "BTC.BTC":   "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
        "ETH.ETH":   "0x0000000000000000000000000000000000000000",
        "LTC.LTC":   "ltc1qw508d6qejxtdg4y5r3zarvary0c5xw7kgmn4n9",
        "DOGE.DOGE": "D5bJTZq7XF8cPcE6GR7THATsnxVnGKci3s",
        "AVAX.AVAX": "0x0000000000000000000000000000000000000000",
        "BSC.BNB":   "0x0000000000000000000000000000000000000000",
      };
      const destination = PLACEHOLDER_DESTINATIONS[toAsset] ?? "0x0000000000000000000000000000000000000000";

      const params = new URLSearchParams({
        from_asset: fromAsset,
        to_asset: toAsset,
        amount: amountBase.toString(),
        destination,
        affiliate: AFFILIATE,
        affiliate_bps: AFFILIATE_BPS,
      });

      const data = await thorRequest<ThorQuoteResponse>(
        `/thorchain/quote/swap?${params.toString()}`
      );

      const settleAmount = (parseInt(data.expected_amount_out) / BASE_UNITS).toFixed(8);
      const rate = (parseInt(data.expected_amount_out) / amountBase).toFixed(8);
      const quoteId = `tc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

      const cached: CachedQuote = {
        inboundAddress: data.inbound_address,
        memo: data.memo,
        expiry: data.expiry,
        fromAsset: opts.fromKey,
        toAsset: opts.toKey,
        depositAmount: opts.amount,
        settleAmount,
        rate,
        fees: {
          network: (parseInt(data.fees.outbound) / BASE_UNITS).toFixed(8),
          protocol: (parseInt(data.fees.liquidity) / BASE_UNITS).toFixed(8),
          affiliate: (parseInt(data.fees.affiliate) / BASE_UNITS).toFixed(8),
        },
        recommendedMin: data.recommended_min_amount_in
          ? (parseInt(data.recommended_min_amount_in) / BASE_UNITS).toFixed(8)
          : undefined,
      };

      quoteCache.set(quoteId, cached);
      cleanExpiredQuotes();

      return {
        provider: "thorchain",
        quoteId,
        fromAsset: opts.fromKey,
        toAsset: opts.toKey,
        depositAmount: opts.amount,
        settleAmount,
        rate,
        min: cached.recommendedMin,
        estimatedTime: data.streaming_swap_seconds,
        expiresAt: new Date(data.expiry * 1000).toISOString(),
        fees: cached.fees,
      };
    },

    async executeSwap(opts): Promise<SwapExecution> {
      const cached = quoteCache.get(opts.quoteId);
      if (!cached) {
        throw new Error("Quote expired or not found");
      }

      if (cached.expiry < Date.now() / 1000) {
        quoteCache.delete(opts.quoteId);
        throw new Error("Quote expired");
      }

      // Build the memo with the actual settle address
      // Format: =:DEST_ASSET:DEST_ADDR:LIMIT:AFFILIATE:FEE_BPS
      const toAsset = toThorAsset(cached.toAsset);
      if (!toAsset) throw new Error(`Cannot build memo: unsupported asset ${cached.toAsset}`);
      const limit = "0"; // no slippage limit for now
      const memo = `=:${toAsset}:${opts.settleAddress}:${limit}:${AFFILIATE}:${AFFILIATE_BPS}`;

      return {
        provider: "thorchain",
        swapId: opts.quoteId,
        depositAddress: cached.inboundAddress,
        depositMemo: memo,
        depositAmount: cached.depositAmount,
        settleAmount: cached.settleAmount,
        rate: cached.rate,
        status: "pending",
        expiresAt: new Date(cached.expiry * 1000).toISOString(),
      };
    },

    async getStatus(swapId: string): Promise<SwapStatusResponse> {
      // swapId for THORChain is the deposit txHash (set by frontend after depositing)
      const data = await thorRequest<ThorTxStatus>(
        `/thorchain/tx/status/${swapId}`
      );

      let status: SwapStatus = "pending";
      let settleHash: string | undefined;
      let settleAmount = "";

      const stages = data.stages;

      if (data.out_txs && data.out_txs.length > 0) {
        status = "complete";
        settleHash = data.out_txs[0].id;
        const coins = data.out_txs[0].coins;
        if (coins.length > 0) {
          settleAmount = (parseInt(coins[0].amount) / BASE_UNITS).toFixed(8);
        }
      } else if (stages.swap_finalised?.completed) {
        status = "processing";
      } else if (stages.inbound_finalised?.completed) {
        status = "processing";
      } else if (stages.inbound_observed?.completed) {
        status = "deposited";
      }

      return {
        swapId,
        provider: "thorchain",
        status,
        depositAmount: data.tx?.coins?.[0]
          ? (parseInt(data.tx.coins[0].amount) / BASE_UNITS).toFixed(8)
          : "",
        settleAmount,
        settleHash,
        settleAddress: data.out_txs?.[0]?.to_address,
      };
    },
  };
}
