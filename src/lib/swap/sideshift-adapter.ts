import {
  getQuote as ssGetQuote,
  createFixedShift,
  getShiftStatus,
  getPairInfo,
  toSideShift,
  getSwappableCurrencies as ssGetSwappable,
} from "./sideshift";
import type {
  SwapProvider,
  SwapQuote,
  SwapExecution,
  SwapStatusResponse,
  SwapStatus,
} from "./types";

// ─── Status mapping ──────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, SwapStatus> = {
  pending: "pending",
  waiting: "pending",
  processing: "processing",
  review: "processing",
  settling: "processing",
  settled: "complete",
  refund: "refunded",
  refunding: "refunded",
  expired: "expired",
};

function mapStatus(ssStatus: string): SwapStatus {
  return STATUS_MAP[ssStatus] ?? "processing";
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function createSideShiftAdapter(): SwapProvider {
  return {
    name: "sideshift",

    getSupportedAssets(): string[] {
      return ssGetSwappable();
    },

    supportsRoute(fromKey: string, toKey: string): boolean {
      return !!toSideShift(fromKey) && !!toSideShift(toKey) && fromKey !== toKey;
    },

    async getQuote(opts): Promise<SwapQuote> {
      // Get pair limits
      const pair = await getPairInfo(opts.fromKey, opts.toKey);

      // Let sideshift.ts resolve the IP internally
      const quote = await ssGetQuote({
        fromKey: opts.fromKey,
        toKey: opts.toKey,
        depositAmount: opts.amount,
      });

      return {
        provider: "sideshift",
        quoteId: quote.id,
        fromAsset: opts.fromKey,
        toAsset: opts.toKey,
        depositAmount: quote.depositAmount,
        settleAmount: quote.settleAmount,
        rate: quote.rate,
        min: pair.min,
        max: pair.max,
        expiresAt: quote.expiresAt,
        fees: {
          network: "0",
          protocol: "0",
        },
      };
    },

    async executeSwap(opts): Promise<SwapExecution> {
      // Let sideshift.ts resolve the IP internally
      const shift = await createFixedShift({
        quoteId: opts.quoteId,
        settleAddress: opts.settleAddress,
        refundAddress: opts.refundAddress,
      });

      return {
        provider: "sideshift",
        swapId: shift.id,
        depositAddress: shift.depositAddress,
        depositMemo: shift.depositMemo,
        depositAmount: shift.depositAmount,
        settleAmount: shift.settleAmount,
        rate: shift.rate,
        status: mapStatus(shift.status),
        expiresAt: shift.expiresAt,
      };
    },

    async getStatus(swapId: string): Promise<SwapStatusResponse> {
      const status = await getShiftStatus(swapId);

      return {
        swapId: status.id,
        provider: "sideshift",
        status: mapStatus(status.status),
        depositAmount: status.depositAmount,
        settleAmount: status.settleAmount,
        settleHash: status.settleHash,
        settleAddress: status.settleAddress,
      };
    },
  };
}
