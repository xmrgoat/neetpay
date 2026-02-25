import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBalances } from "@/lib/wallet/wallet-service";
import { CHAIN_REGISTRY } from "@/lib/chains/registry";
import type { WalletAsset, WalletBalance } from "@/types/wallet";

/**
 * GET /api/dashboard/wallet
 * Returns aggregated wallet balances with USD prices.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const balances = await getBalances(session.user.id);

  // Map raw balances into typed WalletAsset[]
  const assets: WalletAsset[] = balances.map((b) => {
    // Find registry entry by matching currency + chain
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

  const totalUsd = assets.reduce((sum, a) => sum + a.valueUsd, 0);

  // Weighted 24h change
  let change24hUsd = 0;
  for (const a of assets) {
    if (a.change24h !== 0 && a.priceUsd > 0) {
      const previousPrice = a.priceUsd / (1 + a.change24h / 100);
      const previousValue = a.balance * previousPrice;
      change24hUsd += a.valueUsd - previousValue;
    }
  }
  const previousTotal = totalUsd - change24hUsd;
  const change24hPercent =
    previousTotal > 0 ? (change24hUsd / previousTotal) * 100 : 0;

  const wallet: WalletBalance = {
    totalUsd,
    change24hUsd,
    change24hPercent,
    assets,
  };

  return NextResponse.json(wallet);
}
