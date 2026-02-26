import { CHAIN_REGISTRY } from "@/lib/chains/registry";

const BASE_URL = "https://sideshift.ai/api/v2";

function getSecret(): string {
  const secret = process.env.SIDESHIFT_SECRET;
  if (!secret) throw new Error("SIDESHIFT_SECRET is not configured");
  return secret;
}

function getAffiliateId(): string {
  const id = process.env.SIDESHIFT_AFFILIATE_ID;
  if (!id) throw new Error("SIDESHIFT_AFFILIATE_ID is not configured");
  return id;
}

// Cache public IP for server-side requests (SideShift requires a valid public IP)
let cachedPublicIp: string | null = null;

async function getPublicIp(): Promise<string> {
  if (cachedPublicIp) return cachedPublicIp;
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    cachedPublicIp = data.ip;
    return data.ip;
  } catch {
    return "1.1.1.1";
  }
}

function isPrivateIp(ip: string): boolean {
  return ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.");
}

async function resolveUserIp(ip?: string): Promise<string> {
  if (ip && !isPrivateIp(ip)) return ip;
  return getPublicIp();
}

// ─── Coin/Network mapping ───────────────────────────────────────────────────

/**
 * Map our internal CHAIN_REGISTRY keys to SideShift coin + network names.
 * SideShift uses lowercase tickers and network identifiers.
 */
const SIDESHIFT_MAP: Record<string, { coin: string; network: string }> = {
  // Native coins
  ETH:          { coin: "eth",   network: "ethereum" },
  BTC:          { coin: "btc",   network: "bitcoin" },
  SOL:          { coin: "sol",   network: "solana" },
  XMR:          { coin: "xmr",   network: "monero" },
  TRX:          { coin: "trx",   network: "tron" },
  BNB:          { coin: "bnb",   network: "bsc" },
  MATIC:        { coin: "pol",   network: "polygon" },
  LTC:          { coin: "ltc",   network: "litecoin" },
  DOGE:         { coin: "doge",  network: "dogecoin" },
  AVAX:         { coin: "avax",  network: "avax" },
  ARB:          { coin: "arb",   network: "arbitrum" },
  OP:           { coin: "op",    network: "optimism" },
  // USDT multi-chain
  "USDT-ERC20": { coin: "usdt",  network: "ethereum" },
  "USDT-TRC20": { coin: "usdt",  network: "tron" },
  "USDT-POLYGON":{ coin: "usdt", network: "polygon" },
  "USDT-BSC":   { coin: "usdt",  network: "bsc" },
  "USDT-SOL":   { coin: "usdt",  network: "solana" },
  // USDC multi-chain
  "USDC-ERC20": { coin: "usdc",  network: "ethereum" },
  "USDC-POLYGON":{ coin: "usdc", network: "polygon" },
  "USDC-BSC":   { coin: "usdc",  network: "bsc" },
  "USDC-SOL":   { coin: "usdc",  network: "solana" },
  // DAI
  "DAI-ERC20":  { coin: "dai",   network: "ethereum" },
};

export function toSideShift(currencyKey: string): { coin: string; network: string } | null {
  return SIDESHIFT_MAP[currencyKey] ?? null;
}

/**
 * Reverse-map: find the first CHAIN_REGISTRY key for a given SideShift coin+network.
 */
export function fromSideShift(coin: string, network: string): string | null {
  const entry = Object.entries(SIDESHIFT_MAP).find(
    ([, v]) => v.coin === coin.toLowerCase() && v.network === network.toLowerCase(),
  );
  return entry?.[0] ?? null;
}

/**
 * Get all swappable currency keys (ones we have a SideShift mapping for).
 */
export function getSwappableCurrencies(): string[] {
  return Object.keys(SIDESHIFT_MAP).filter((key) => key in CHAIN_REGISTRY);
}

// ─── API types ──────────────────────────────────────────────────────────────

export interface SideShiftQuote {
  id: string;
  createdAt: string;
  depositCoin: string;
  settleCoin: string;
  depositNetwork: string;
  settleNetwork: string;
  expiresAt: string;
  depositAmount: string;
  settleAmount: string;
  rate: string;
  affiliateId: string;
}

export interface SideShiftShift {
  id: string;
  createdAt: string;
  depositCoin: string;
  settleCoin: string;
  depositNetwork: string;
  settleNetwork: string;
  depositAddress: string;
  depositMemo?: string;
  settleAddress: string;
  settleMemo?: string;
  depositAmount: string;
  settleAmount: string;
  expiresAt: string;
  status: string;
  rate: string;
  averageShiftSeconds?: string;
}

export interface SideShiftPairInfo {
  min: string;
  max: string;
  rate: string;
  depositCoin: string;
  settleCoin: string;
  depositNetwork: string;
  settleNetwork: string;
}

export interface SideShiftStatus {
  id: string;
  status: string;
  depositCoin: string;
  settleCoin: string;
  depositNetwork: string;
  settleNetwork: string;
  depositAddress: string;
  settleAddress: string;
  depositAmount: string;
  settleAmount: string;
  rate: string;
  expiresAt: string;
  depositReceivedAt?: string;
  settleHash?: string;
}

// ─── API calls ──────────────────────────────────────────────────────────────

async function ssRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  userIp?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-sideshift-secret": getSecret(),
  };
  if (userIp) headers["x-user-ip"] = userIp;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SideShift ${method} ${path} failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Request a fixed-rate quote.
 */
export async function getQuote(opts: {
  fromKey: string;
  toKey: string;
  depositAmount: string;
  userIp?: string;
}): Promise<SideShiftQuote> {
  const from = toSideShift(opts.fromKey);
  const to = toSideShift(opts.toKey);
  if (!from) throw new Error(`Unsupported deposit currency: ${opts.fromKey}`);
  if (!to) throw new Error(`Unsupported settle currency: ${opts.toKey}`);

  const ip = await resolveUserIp(opts.userIp);

  return ssRequest<SideShiftQuote>("POST", "/quotes", {
    depositCoin: from.coin,
    depositNetwork: from.network,
    settleCoin: to.coin,
    settleNetwork: to.network,
    depositAmount: opts.depositAmount,
    affiliateId: getAffiliateId(),
  }, ip);
}

/**
 * Create a fixed-rate shift from an existing quote.
 */
export async function createFixedShift(opts: {
  quoteId: string;
  settleAddress: string;
  refundAddress?: string;
  userIp?: string;
}): Promise<SideShiftShift> {
  const ip = await resolveUserIp(opts.userIp);

  return ssRequest<SideShiftShift>("POST", "/shifts/fixed", {
    quoteId: opts.quoteId,
    settleAddress: opts.settleAddress,
    affiliateId: getAffiliateId(),
    ...(opts.refundAddress && { refundAddress: opts.refundAddress }),
  }, ip);
}

/**
 * Get current status of a shift.
 */
export async function getShiftStatus(shiftId: string): Promise<SideShiftStatus> {
  return ssRequest<SideShiftStatus>("GET", `/shifts/${shiftId}`);
}

/**
 * Get pair info (min, max, rate) for a trading pair.
 */
export async function getPairInfo(fromKey: string, toKey: string): Promise<SideShiftPairInfo> {
  const from = toSideShift(fromKey);
  const to = toSideShift(toKey);
  if (!from) throw new Error(`Unsupported deposit currency: ${fromKey}`);
  if (!to) throw new Error(`Unsupported settle currency: ${toKey}`);

  const fromStr = `${from.coin}-${from.network}`;
  const toStr = `${to.coin}-${to.network}`;

  return ssRequest<SideShiftPairInfo>(
    "GET",
    `/pair/${fromStr}/${toStr}?affiliateId=${getAffiliateId()}`,
  );
}
