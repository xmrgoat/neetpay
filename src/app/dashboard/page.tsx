import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOverviewStats, getRecentTransactions, getAnalyticsData } from "@/lib/dashboard/queries";
import { getBalances } from "@/lib/wallet/wallet-service";
import { getAllPrices } from "@/lib/price/coingecko";
import { CHAIN_REGISTRY } from "@/lib/chains/registry";
import { RevenueSummary } from "@/components/dashboard/revenue-summary";
import { OverviewCharts } from "@/components/dashboard/overview-charts";
import { DashboardRightColumn } from "@/components/dashboard/dashboard-right-column";
import { OverviewKpis } from "@/components/dashboard/overview-kpis";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import type { Transaction } from "@/components/dashboard/recent-transactions";

// Currencies to always show in the wallet panel (even at zero balance)
const DISPLAY_CURRENCIES = [
  "BTC", "ETH", "XMR", "SOL", "USDT", "USDC", "TRX", "BNB",
  "LTC", "DOGE", "XRP", "TON", "AVAX", "ARB", "OP", "MATIC",
] as const;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [stats, analytics, recentPayments, balances, prices] = await Promise.all([
    getOverviewStats(userId),
    getAnalyticsData(userId, thirtyDaysAgo, now),
    getRecentTransactions(userId, 6),
    getBalances(userId),
    getAllPrices(),
  ]);

  // ── Build wallet holdings ─────────────────────────────────────────────────
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

  // ── Map Payment[] → Transaction[] ─────────────────────────────────────────
  const recentTxs: Transaction[] = recentPayments.map((p) => ({
    id: p.id,
    amount: p.amount,
    cryptoAmount: p.payAmount ?? 0,
    status: p.status as Transaction["status"],
    trackId: p.trackId,
    payCurrency: p.payCurrency ?? "BTC",
    txHash: p.txId ?? "",
    address: p.payAddress ?? "",
    createdAt: p.createdAt,
  }));

  return (
    <div className="grid h-full grid-cols-1 gap-5 lg:grid-cols-12">

      {/* ── LEFT COLUMN ── */}
      <div className="flex min-h-0 flex-col gap-5 overflow-y-auto lg:col-span-9 lg:border-r lg:border-border/40 lg:pr-5 pb-4 no-scrollbar">

        <OverviewKpis
          payments={stats.paymentCount}
          paymentsChange={stats.paymentChange}
          conversionRate={stats.conversionRate}
          avgPayment={stats.avgPayment}
          avgChange={stats.avgChange}
          activeLinks={stats.pendingCount}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-8">
          <div className="sm:col-span-3">
            <RevenueSummary
              today={stats.todayRevenue}
              week={stats.weekRevenue}
              month={stats.monthRevenue}
              total={stats.totalRevenue}
              successRate={stats.conversionRate}
              pendingPayout={stats.pendingPayout}
              pendingCount={stats.pendingCount}
              paymentMethods={stats.paymentMethods}
            />
          </div>
          <div className="sm:col-span-5">
            <OverviewCharts volumeByDay={analytics.volumeByDay} />
          </div>
        </div>

        <RecentTransactions transactions={recentTxs} />
      </div>

      {/* ── RIGHT COLUMN ── */}
      <DashboardRightColumn
        totalUsd={totalUsd}
        change24h={change24hUsd}
        holdings={holdings}
      />

    </div>
  );
}
