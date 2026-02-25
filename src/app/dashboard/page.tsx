import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getOverviewStats,
  getRecentTransactions,
  getAnalyticsData,
  getConversionFunnel,
  getGeoDistribution,
  getWalletSummary,
} from "@/lib/dashboard/queries";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { OverviewCharts } from "@/components/dashboard/overview-charts";
import {
  WalletWidget,
  QuickActions,
  FunnelMini,
  TopChains,
} from "@/components/dashboard/overview-widgets";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PaymentStatus } from "@/lib/constants";

const statusDot: Record<PaymentStatus, string> = {
  pending: "bg-amber-500",
  confirming: "bg-blue-500",
  paid: "bg-emerald-500",
  expired: "bg-neutral-400",
  failed: "bg-red-500",
  underpaid: "bg-orange-500",
  refunded: "bg-purple-500",
};

function relativeTime(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [stats, recentTxs, analyticsData, funnel, chainDistribution, wallet] =
    await Promise.all([
      getOverviewStats(session.user.id),
      getRecentTransactions(session.user.id, 7),
      getAnalyticsData(session.user.id, thirtyDaysAgo, now),
      getConversionFunnel(session.user.id, thirtyDaysAgo, now),
      getGeoDistribution(session.user.id, 5, thirtyDaysAgo, now),
      getWalletSummary(session.user.id),
    ]);

  return (
    <div className="space-y-6">
      {/* Section: Total Overview */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-lg font-semibold text-foreground">
          Total Overview
        </h1>
        <QuickActions />
      </div>

      {/* Stat cards */}
      <OverviewCards stats={stats} />

      {/* Main grid: Chart + Wallet */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Chart -- takes 3 columns */}
        <div className="xl:col-span-3">
          <div className="rounded-xl border border-border bg-background p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-foreground">
                  Payment Volume
                </h2>
                <p className="text-xs text-muted">Daily revenue -- last 30 days</p>
              </div>
            </div>
            <OverviewCharts volumeByDay={analyticsData.volumeByDay} />
          </div>
        </div>

        {/* Right column: Wallet + Funnel */}
        <div className="flex flex-col gap-6 xl:col-span-2">
          <WalletWidget
            totalUsd={wallet.totalUsd}
            holdings={wallet.holdings}
          />
          <FunnelMini
            created={funnel.created}
            confirming={funnel.confirming}
            paid={funnel.paid}
          />
        </div>
      </div>

      {/* Second grid: Recent Transactions + Top Chains */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Recent Transactions -- takes 3 columns */}
        <div className="xl:col-span-3">
          <div className="rounded-xl border border-border bg-background">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-medium text-foreground">
                Recent Transactions
              </h2>
              <Link
                href="/dashboard/payments"
                className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
              >
                See All
                <ArrowRight size={12} />
              </Link>
            </div>

            {recentTxs.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-xs text-muted">
                  No transactions yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentTxs.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    {/* Status dot */}
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        statusDot[tx.status as PaymentStatus] ?? "bg-muted"
                      }`}
                    />

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        ${tx.amount.toFixed(2)}
                        <span className="ml-1.5 text-xs font-normal text-muted">
                          {tx.currency}
                        </span>
                      </p>
                      <p className="font-mono text-[11px] text-muted">
                        {tx.trackId.slice(0, 12)}
                      </p>
                    </div>

                    {/* Right side */}
                    <div className="shrink-0 text-right">
                      {tx.payCurrency && (
                        <p className="font-mono text-xs text-foreground-secondary uppercase">
                          {tx.payCurrency}
                        </p>
                      )}
                      <p className="text-[11px] text-muted tabular-nums">
                        {relativeTime(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Chains -- takes 2 columns */}
        <div className="xl:col-span-2">
          <TopChains chains={chainDistribution} />
        </div>
      </div>

      {/* Bottom grid: Crypto breakdown + Status */}
      {(analyticsData.cryptoBreakdown.length > 0 || analyticsData.statusBreakdown.length > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Crypto breakdown */}
          {analyticsData.cryptoBreakdown.length > 0 && (
            <div className="rounded-xl border border-border bg-background p-5">
              <h2 className="text-sm font-medium text-foreground">
                By Cryptocurrency
              </h2>
              <p className="text-xs text-muted">Revenue split by currency</p>

              <div className="mt-4 space-y-3">
                {analyticsData.cryptoBreakdown.slice(0, 6).map((item) => {
                  const maxVol = analyticsData.cryptoBreakdown[0]?.volume || 1;
                  const pct = (item.volume / maxVol) * 100;
                  return (
                    <div key={item.crypto} className="flex items-center gap-3">
                      <span className="w-12 font-mono text-xs font-medium text-foreground-secondary uppercase">
                        {item.crypto}
                      </span>
                      <div className="flex-1">
                        <div className="h-2 overflow-hidden rounded-full bg-surface">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-20 text-right font-mono text-xs text-muted tabular-nums">
                        ${item.volume.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status distribution */}
          {analyticsData.statusBreakdown.length > 0 && (
            <div className="rounded-xl border border-border bg-background p-5">
              <h2 className="text-sm font-medium text-foreground">
                Status Breakdown
              </h2>
              <p className="text-xs text-muted">Payment outcomes</p>

              <div className="mt-4 space-y-2.5">
                {analyticsData.statusBreakdown.map((item) => {
                  const total = analyticsData.statusBreakdown.reduce((s, i) => s + i.count, 0);
                  const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0";
                  return (
                    <div key={item.status} className="flex items-center gap-3">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          statusDot[item.status as PaymentStatus] ?? "bg-muted"
                        }`}
                      />
                      <span className="w-20 text-xs capitalize text-foreground-secondary">
                        {item.status}
                      </span>
                      <div className="flex-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                          <div
                            className="h-full rounded-full bg-foreground-secondary/30 transition-all duration-500"
                            style={{ width: `${Math.max(parseFloat(pct), 2)}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-8 text-right font-mono text-xs font-medium text-foreground tabular-nums">
                        {item.count}
                      </span>
                      <span className="w-12 text-right font-mono text-[11px] text-muted tabular-nums">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
