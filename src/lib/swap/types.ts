// ─── Unified Swap Provider Interface ─────────────────────────────────────────

export type SwapStatus =
  | "pending"
  | "deposited"
  | "processing"
  | "complete"
  | "refunded"
  | "expired"
  | "failed";

export interface SwapQuote {
  provider: "thorchain" | "oneinch" | "sideshift";
  quoteId: string;
  fromAsset: string;
  toAsset: string;
  depositAmount: string;
  settleAmount: string;
  rate: string;
  min?: string;
  max?: string;
  estimatedTime?: number;
  expiresAt: string;
  fees: {
    network: string;
    protocol: string;
    affiliate?: string;
  };
}

export interface SwapExecution {
  provider: "thorchain" | "oneinch" | "sideshift";
  swapId: string;
  depositAddress: string;
  depositMemo?: string;
  depositAmount: string;
  settleAmount: string;
  rate: string;
  status: SwapStatus;
  expiresAt: string;
  settleHash?: string;
}

export interface SwapStatusResponse {
  swapId: string;
  provider: "thorchain" | "oneinch" | "sideshift";
  status: SwapStatus;
  depositAmount: string;
  settleAmount: string;
  settleHash?: string;
  settleAddress?: string;
}

export interface SwapProvider {
  name: "thorchain" | "oneinch" | "sideshift";

  getSupportedAssets(): string[];

  supportsRoute(fromKey: string, toKey: string): boolean;

  getQuote(opts: {
    fromKey: string;
    toKey: string;
    amount: string;
  }): Promise<SwapQuote>;

  executeSwap(opts: {
    quoteId: string;
    settleAddress: string;
    refundAddress?: string;
  }): Promise<SwapExecution>;

  getStatus(swapId: string): Promise<SwapStatusResponse>;
}
