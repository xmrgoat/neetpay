import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOverviewStats, getRecentTransactions, getAnalyticsData, getKpiSparklines } from "@/lib/dashboard/queries";
import { getBalances, getPrimaryAddress } from "@/lib/wallet/wallet-service";
import { getAllPrices } from "@/lib/price/coingecko";
import { CHAIN_REGISTRY } from "@/lib/chains/registry";
import { OverviewHero } from "@/components/dashboard/overview-hero";
import { OverviewCharts } from "@/components/dashboard/overview-charts";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { LivePulse } from "@/components/dashboard/live-pulse";
import { DashboardRightColumn } from "@/components/dashboard/dashboard-right-column";
import type { Transaction } from "@/components/dashboard/activity-feed";

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

  const [stats, analytics, recentPayments, balances, prices, sparklines, primaryAddress] = await Promise.all([
    getOverviewStats(userId),
    getAnalyticsData(userId, thirtyDaysAgo, now),
    getRecentTransactions(userId, 8),
    getBalances(userId),
    getAllPrices(),
    getKpiSparklines(userId),
    getPrimaryAddress(userId),
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

  // ── Derive live status ────────────────────────────────────────────────────
  const confirmingCount = recentTxs.filter((t) => t.status === "confirming").length;
  const lastPaymentAge = recentTxs.length > 0
    ? formatAge(recentTxs[0].createdAt)
    : undefined;

  return (
    <div className="grid h-full grid-cols-1 gap-5 lg:grid-cols-12">

      {/* ── LEFT COLUMN ── */}
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto lg:col-span-9 lg:border-r lg:border-border/40 lg:pr-5 pb-4 no-scrollbar">

        {/* Live status bar */}
        <LivePulse
          pendingCount={stats.pendingCount}
          confirmingCount={confirmingCount}
          lastPaymentAge={lastPaymentAge}
        />

        {/* Hero — revenue + KPIs + status, all in one section */}
        <OverviewHero
          today={stats.todayRevenue}
          week={stats.weekRevenue}
          month={stats.monthRevenue}
          total={stats.totalRevenue}
          payments={stats.paymentCount}
          paymentsChange={stats.paymentChange}
          conversionRate={stats.conversionRate}
          avgPayment={stats.avgPayment}
          avgChange={stats.avgChange}
          activeLinks={stats.pendingCount}
          pendingPayout={stats.pendingPayout}
          pendingCount={stats.pendingCount}
          successRate={stats.conversionRate}
          paymentMethods={stats.paymentMethods}
          sparklines={sparklines}
        />

        {/* Chart — full width, more breathing room */}
        <OverviewCharts volumeByDay={analytics.volumeByDay} />

        {/* Activity feed — grouped by day, not a table */}
        <ActivityFeed transactions={recentTxs} />
      </div>

      {/* ── RIGHT COLUMN ── */}
      <DashboardRightColumn
        totalUsd={totalUsd}
        change24h={change24hUsd}
        holdings={holdings}
        walletAddress={primaryAddress ?? undefined}
      />

    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatAge(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
