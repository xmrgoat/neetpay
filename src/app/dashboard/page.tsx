import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOverviewStats, getRecentTransactions, getAnalyticsData, getKpiSparklines } from "@/lib/dashboard/queries";
import { OverviewHero } from "@/components/dashboard/overview-hero";
import { OverviewCharts } from "@/components/dashboard/overview-charts";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { LivePulse } from "@/components/dashboard/live-pulse";
import type { Transaction } from "@/components/dashboard/activity-feed";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [stats, analytics, recentPayments, sparklines] = await Promise.all([
    getOverviewStats(userId),
    getAnalyticsData(userId, thirtyDaysAgo, now),
    getRecentTransactions(userId, 8),
    getKpiSparklines(userId),
  ]);

  // -- Map Payment[] -> Transaction[] --
  const recentTxs: Transaction[] = recentPayments.map((p) => ({
    id: p.id,
    amount: p.amount,
    cryptoAmount: p.payAmount ?? 0,
    status: p.status as Transaction["status"],
    trackId: p.trackId,
    payCurrency: p.payCurrency ?? "XMR",
    txHash: p.txId ?? "",
    address: p.payAddress ?? "",
    createdAt: p.createdAt,
  }));

  // -- Derive live status --
  const confirmingCount = recentTxs.filter((t) => t.status === "confirming").length;
  const lastPaymentAge = recentTxs.length > 0
    ? formatAge(recentTxs[0].createdAt)
    : undefined;

  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pb-4 no-scrollbar">

      {/* Live status bar */}
      <LivePulse
        pendingCount={stats.pendingCount}
        confirmingCount={confirmingCount}
        lastPaymentAge={lastPaymentAge}
      />

      {/* Hero -- revenue + KPIs + status */}
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

      {/* Chart */}
      <OverviewCharts volumeByDay={analytics.volumeByDay} />

      {/* Activity feed */}
      <ActivityFeed transactions={recentTxs} />

    </div>
  );
}

// -- Helpers --

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
