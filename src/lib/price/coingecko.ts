// @ts-nocheck
import { db } from "@/lib/db";

// ─── Alchemy Prices API ─────────────────────────────────────────────────────

const ALCHEMY_PRICES_BASE = "https://api.g.alchemy.com/prices/v1";

function getAlchemyKey(): string {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) throw new Error("ALCHEMY_API_KEY is not configured");
  return key;
}

/** Symbols to fetch prices for (Alchemy supports these via by-symbol endpoint). */
const PRICE_SYMBOLS = [
  "BTC", "ETH", "SOL", "XMR", "TRX", "BNB", "MATIC",
  "LTC", "DOGE", "AVAX", "ARB", "OP",
];

const STABLECOINS = ["USDT", "USDC", "DAI"];

interface AlchemyPriceEntry {
  symbol: string;
  prices: Array<{ currency: string; value: string; lastUpdatedAt: string }>;
  error: string | null;
}

interface AlchemyPricesResponse {
  data: AlchemyPriceEntry[];
}

/**
 * Fetch current USD prices from Alchemy Prices API.
 * Returns null if the request fails entirely.
 */
export async function fetchPrices(): Promise<
  Record<string, { usdPrice: number; change24h: number | null }> | null
> {
  const symbols = PRICE_SYMBOLS.join(",");
  const url = `${ALCHEMY_PRICES_BASE}/${getAlchemyKey()}/tokens/by-symbol?symbols=${symbols}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (res.status === 429) {
    console.warn("[price] Alchemy rate limit hit, skipping update");
    return null;
  }

  if (!res.ok) {
    throw new Error(`Alchemy Prices API error: ${res.status} ${res.statusText}`);
  }

  const json: AlchemyPricesResponse = await res.json();

  // Load previous prices from cache to compute 24h change
  const previousPrices = await getAllPrices();

  const prices: Record<string, { usdPrice: number; change24h: number | null }> = {};

  for (const entry of json.data) {
    if (entry.error) continue;
    const usdEntry = entry.prices.find((p) => p.currency === "usd");
    if (!usdEntry) continue;

    const usdPrice = parseFloat(usdEntry.value);
    const prev = previousPrices[entry.symbol];

    // Compute 24h change from cached price delta
    let change24h: number | null = null;
    if (prev && prev.usdPrice > 0) {
      change24h = ((usdPrice - prev.usdPrice) / prev.usdPrice) * 100;
      // If the cached change is already set and the price hasn't changed much,
      // carry forward the existing change value (it gets more accurate over time)
      if (prev.change24h !== null && Math.abs(usdPrice - prev.usdPrice) / prev.usdPrice < 0.001) {
        change24h = prev.change24h;
      }
    }

    prices[entry.symbol] = { usdPrice, change24h };
  }

  // Stablecoins hardcoded
  for (const stable of STABLECOINS) {
    prices[stable] = { usdPrice: 1, change24h: 0 };
  }

  return prices;
}

/**
 * Fetch prices from Alchemy and upsert into PriceCache table.
 */
export async function updatePriceCache(): Promise<number> {
  const prices = await fetchPrices();
  if (!prices) return 0;

  const upserts = Object.entries(prices).map(([symbol, { usdPrice, change24h }]) =>
    db.priceCache.upsert({
      where: { symbol },
      create: { symbol, usdPrice, change24h },
      update: { usdPrice, change24h },
    }),
  );

  const results = await db.$transaction(upserts);
  console.log(`[price] Updated ${results.length} prices via Alchemy`);
  return results.length;
}

/**
 * Read a single price from the cache. Returns 0 if not found.
 */
export async function getPrice(symbol: string): Promise<number> {
  const row = await db.priceCache.findUnique({
    where: { symbol: symbol.toUpperCase() },
  });
  return row?.usdPrice ?? 0;
}

/**
 * Read all cached prices.
 */
export async function getAllPrices(): Promise<
  Record<string, { usdPrice: number; change24h: number | null }>
> {
  const rows = await db.priceCache.findMany();
  const result: Record<string, { usdPrice: number; change24h: number | null }> = {};

  for (const row of rows) {
    result[row.symbol] = {
      usdPrice: row.usdPrice,
      change24h: row.change24h,
    };
  }

  return result;
}

/**
 * Compute USD portfolio value from an array of balances.
 */
export async function getPortfolioValue(
  balances: { currency: string; amount: number }[],
): Promise<{
  total: number;
  byAsset: {
    currency: string;
    amount: number;
    usdValue: number;
    price: number;
    change24h: number | null;
  }[];
}> {
  const prices = await getAllPrices();

  const byAsset = balances.map(({ currency, amount }) => {
    const cached = prices[currency.toUpperCase()];
    const price = cached?.usdPrice ?? 0;
    return {
      currency,
      amount,
      usdValue: amount * price,
      price,
      change24h: cached?.change24h ?? null,
    };
  });

  const total = byAsset.reduce((sum, a) => sum + a.usdValue, 0);

  return { total, byAsset };
}
