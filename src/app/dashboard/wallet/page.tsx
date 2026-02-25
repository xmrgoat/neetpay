import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBalances } from "@/lib/wallet/wallet-service";
import { CHAIN_REGISTRY } from "@/lib/chains/registry";
import { WalletPageClient } from "./client";
import type { WalletAsset, WalletBalance } from "@/types/wallet";

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const balances = await getBalances(session.user.id);

  // Build typed assets from DB balances + registry metadata
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

  // Also include zero-balance entries from the registry for receive
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

  const totalUsd = assets.reduce((sum, a) => sum + a.valueUsd, 0);

  // Compute 24h change
  let change24hUsd = 0;
  for (const a of assets) {
    if (a.change24h !== 0 && a.priceUsd > 0) {
      const previousPrice = a.priceUsd / (1 + a.change24h / 100);
      change24hUsd += a.valueUsd - a.balance * previousPrice;
    }
  }
  const previousTotal = totalUsd - change24hUsd;
  const change24hPercent =
    previousTotal > 0 ? (change24hUsd / previousTotal) * 100 : 0;

  const wallet: WalletBalance = {
    totalUsd,
    change24hUsd,
    change24hPercent,
    assets: allAssets,
  };

  return <WalletPageClient wallet={wallet} />;
}
