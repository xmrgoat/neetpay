import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBalances } from "@/lib/wallet/wallet-service";
import { getAllPrices } from "@/lib/price/coingecko";
import { CHAIN_REGISTRY } from "@/lib/chains/registry";
import { WalletPageClient } from "./client";
import type { WalletAsset, WalletBalance } from "@/types/wallet";

const DISPLAY_CURRENCIES = [
  "BTC", "ETH", "XMR", "SOL", "USDT", "USDC", "TRX", "BNB",
  "LTC", "DOGE", "AVAX", "ARB", "OP", "MATIC",
] as const;

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [balances, prices] = await Promise.all([
    getBalances(userId),
    getAllPrices(),
  ]);

  // ── Build WalletAsset[] (for backward compat) ──────────────────────────
  const assets: WalletAsset[] = balances.map((b) => {
    const entry = Object.entries(CHAIN_REGISTRY).find(
      ([, e]) => e.symbol === b.currency && e.chain === b.chain,
    );
    const key = entry?.[0] ?? `${b.currency}-${b.chain}`;
    const meta = entry?.[1];

    return {
      key,
      symbol: b.currency,
      name: meta?.name ?? b.currency,
      chain: b.chain,
      native: meta?.native ?? true,
      balance: b.amount,
      priceUsd: b.usdPrice ?? 0,
      change24h: b.change24h ?? 0,
      valueUsd: b.usdValue ?? 0,
    };
  });

  const existingKeys = new Set(assets.map((a) => a.key));
  const allAssets = [...assets];

  for (const [key, entry] of Object.entries(CHAIN_REGISTRY)) {
    if (!existingKeys.has(key)) {
      allAssets.push({
        key,
        symbol: entry.symbol,
        name: entry.name,
        chain: entry.chain,
        native: entry.native,
        balance: 0,
        priceUsd: 0,
        change24h: 0,
        valueUsd: 0,
      });
    }
  }

  // ── Build CryptoHolding[] (for WalletCard + action panels) ─────────────
  const balanceMap = new Map(
    balances.map((b) => [`${b.currency}-${b.chain}`, b]),
  );

  const holdings = DISPLAY_CURRENCIES.map((symbol) => {
    const entry = CHAIN_REGISTRY[symbol];
    const chain = entry?.chain ?? "unknown";
    const bal = balanceMap.get(`${symbol}-${chain}`);
    const cached = prices[symbol];

    const amount = bal?.amount ?? 0;
    const price = cached?.usdPrice ?? 0;

    return {
      currency: symbol,
      amount,
      usdValue: amount * price,
      price,
      change24h: cached?.change24h ?? 0,
    };
  });

  const totalUsd = holdings.reduce((s, h) => s + h.usdValue, 0);

  let change24hUsd = 0;
  for (const h of holdings) {
    if (h.change24h && h.price > 0 && h.amount > 0) {
      const prevPrice = h.price / (1 + h.change24h / 100);
      change24hUsd += h.amount * (h.price - prevPrice);
    }
  }

  const wallet: WalletBalance = {
    totalUsd,
    change24hUsd,
    change24hPercent:
      totalUsd - change24hUsd > 0
        ? (change24hUsd / (totalUsd - change24hUsd)) * 100
        : 0,
    assets: allAssets,
  };

  return (
    <WalletPageClient
      wallet={wallet}
      holdings={holdings}
      totalUsd={totalUsd}
      change24hUsd={change24hUsd}
    />
  );
}
