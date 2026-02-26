import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBalances } from "@/lib/wallet/wallet-service";
import { getAllPrices } from "@/lib/price/coingecko";
import { CHAIN_REGISTRY } from "@/lib/chains/registry";
import { SwapInterface } from "@/components/dashboard/swap-interface";

const DISPLAY_CURRENCIES = [
  "BTC", "ETH", "XMR", "SOL", "USDT", "USDC", "TRX", "BNB",
  "LTC", "DOGE", "XRP", "TON", "AVAX", "ARB", "OP", "MATIC",
] as const;

export default async function SwapPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [balances, prices] = await Promise.all([
    getBalances(session.user.id),
    getAllPrices(),
  ]);

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

  return <SwapInterface holdings={holdings} />;
}
