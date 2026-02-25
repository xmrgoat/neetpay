import { db } from "@/lib/db";

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XMR: "monero",
  TRX: "tron",
  BNB: "binancecoin",
  MATIC: "matic-network",
};

const STABLECOINS = ["USDT", "USDC", "DAI"];

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

interface CoinGeckoPrice {
  usd: number;
  usd_24h_change?: number;
}

type CoinGeckoResponse = Record<string, CoinGeckoPrice>;

/**
 * Fetch current USD prices + 24h change from CoinGecko free API.
 * Returns null if rate-limited.
 */
export async function fetchPrices(): Promise<
  Record<string, { usdPrice: number; change24h: number | null }> | null
> {
  const ids = Object.values(COINGECKO_IDS).join(",");
  const url = `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (res.status === 429) {
    console.warn("[price] CoinGecko rate limit hit, skipping update");
    return null;
  }

  if (!res.ok) {
    throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`);
  }

  const data: CoinGeckoResponse = await res.json();

  const idToSymbol = Object.entries(COINGECKO_IDS).reduce(
    (acc, [symbol, id]) => {
      acc[id] = symbol;
      return acc;
    },
    {} as Record<string, string>,
  );

  const prices: Record<string, { usdPrice: number; change24h: number | null }> = {};

  for (const [cgId, priceData] of Object.entries(data)) {
    const symbol = idToSymbol[cgId];
    if (symbol) {
      prices[symbol] = {
        usdPrice: priceData.usd,
        change24h: priceData.usd_24h_change ?? null,
      };
    }
  }

  for (const stable of STABLECOINS) {
    prices[stable] = { usdPrice: 1, change24h: 0 };
  }

  return prices;
}

/**
 * Fetch prices from CoinGecko and upsert into PriceCache table.
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
  console.log(`[price] Updated ${results.length} prices`);
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
