import { createThorchainProvider } from "./thorchain";
import { createOneInchProvider } from "./oneinch";
import { createSideShiftAdapter } from "./sideshift-adapter";
import type {
  SwapProvider,
  SwapQuote,
  SwapExecution,
  SwapStatusResponse,
} from "./types";

// ─── Lazy-init providers ─────────────────────────────────────────────────────

let thorchain: SwapProvider;
let oneinch: SwapProvider;
let sideshift: SwapProvider;

function getThorchain(): SwapProvider {
  if (!thorchain) thorchain = createThorchainProvider();
  return thorchain;
}

function getOneInch(): SwapProvider {
  if (!oneinch) oneinch = createOneInchProvider();
  return oneinch;
}

function getSideShift(): SwapProvider {
  if (!sideshift) sideshift = createSideShiftAdapter();
  return sideshift;
}

// ─── Smart routing ───────────────────────────────────────────────────────────

/**
 * Select the best swap provider for a given pair.
 *
 * Priority:
 * 1. Same EVM chain → 1inch Fusion (best DEX rates, if API key set)
 * 2. Cross-chain → THORChain (native cross-chain, no custodian)
 * 3. Fallback → SideShift (broadest pair coverage)
 */
export function resolveProvider(fromKey: string, toKey: string): SwapProvider | null {
  // 1inch for same-chain EVM swaps
  const oneInchProvider = getOneInch();
  if (oneInchProvider.supportsRoute(fromKey, toKey)) {
    return oneInchProvider;
  }

  // THORChain for cross-chain
  const thorchainProvider = getThorchain();
  if (thorchainProvider.supportsRoute(fromKey, toKey)) {
    return thorchainProvider;
  }

  // SideShift fallback
  const sideshiftProvider = getSideShift();
  if (sideshiftProvider.supportsRoute(fromKey, toKey)) {
    return sideshiftProvider;
  }

  return null;
}

// ─── Unified API ─────────────────────────────────────────────────────────────

export async function getQuote(opts: {
  fromKey: string;
  toKey: string;
  amount: string;
}): Promise<SwapQuote> {
  const provider = resolveProvider(opts.fromKey, opts.toKey);
  if (!provider) {
    throw new Error(`No swap provider supports ${opts.fromKey} → ${opts.toKey}`);
  }
  return provider.getQuote(opts);
}

export async function executeSwap(opts: {
  quoteId: string;
  settleAddress: string;
  refundAddress?: string;
  provider: "thorchain" | "oneinch" | "sideshift";
}): Promise<SwapExecution> {
  const providerMap: Record<string, () => SwapProvider> = {
    thorchain: getThorchain,
    oneinch: getOneInch,
    sideshift: getSideShift,
  };

  const getProvider = providerMap[opts.provider];
  if (!getProvider) throw new Error(`Unknown provider: ${opts.provider}`);

  // Validate quoteId prefix matches the declared provider
  const prefix = opts.quoteId.startsWith("tc_") ? "thorchain"
    : opts.quoteId.startsWith("1i_") ? "oneinch"
    : "sideshift";
  if (prefix !== opts.provider) {
    throw new Error(`Provider mismatch: quoteId prefix "${prefix}" ≠ provider "${opts.provider}"`);
  }

  return getProvider().executeSwap({
    quoteId: opts.quoteId,
    settleAddress: opts.settleAddress,
    refundAddress: opts.refundAddress,
  });
}

export async function getSwapStatus(
  swapId: string,
  provider: "thorchain" | "oneinch" | "sideshift",
): Promise<SwapStatusResponse> {
  const providerMap: Record<string, () => SwapProvider> = {
    thorchain: getThorchain,
    oneinch: getOneInch,
    sideshift: getSideShift,
  };

  const getProvider = providerMap[provider];
  if (!getProvider) throw new Error(`Unknown provider: ${provider}`);

  return getProvider().getStatus(swapId);
}

export function getSwappableCurrencies(): string[] {
  const all = new Set<string>();
  for (const asset of getThorchain().getSupportedAssets()) all.add(asset);
  for (const asset of getOneInch().getSupportedAssets()) all.add(asset);
  for (const asset of getSideShift().getSupportedAssets()) all.add(asset);
  return [...all];
}
