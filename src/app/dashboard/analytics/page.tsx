import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import {
  getAnalyticsData,
  getConversionFunnel,
  getGeoDistribution,
  getRevenueByWeekday,
  getAveragePaymentTime,
  getDailyPaymentCounts,
} from "@/lib/dashboard/queries";
import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";
import { AnalyticsExtended } from "@/components/dashboard/analytics-extended";
import { DateRangeSelector } from "@/components/dashboard/date-range-selector";
import { BarChart3, DollarSign, Hash, TrendingUp } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ range?: string }>;
}

function getDateRange(range: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "90d":
      start.setDate(start.getDate() - 90);
      break;
    case "1y":
      start.setFullYear(start.getFullYear() - 1);
      break;
    case "all":
      start.setFullYear(2020);
      break;
    case "30d":
    default:
      start.setDate(start.getDate() - 30);
      break;
  }

  return { start, end };
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const summaryCards = [
  {
    key: "volume",
    label: "Total Volume",
    icon: DollarSign,
    iconBg: "bg-primary-muted",
    iconColor: "text-primary",
  },
  {
    key: "transactions",
    label: "Transactions",
    icon: Hash,
    iconBg: "bg-info-muted",
    iconColor: "text-info",
  },
  {
    key: "avg",
    label: "Avg Value",
    icon: TrendingUp,
    iconBg: "bg-success-muted",
    iconColor: "text-success",
  },
] as const;

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const range = params.range || "30d";
  const { start, end } = getDateRange(range);

  const [data, funnel, chainDistribution, weekdayRevenue, avgPaymentTime, dailyCounts] =
    await Promise.all([
      getAnalyticsData(session.user.id, start, end),
      getConversionFunnel(session.user.id, start, end),
      getGeoDistribution(session.user.id, 10, start, end),
      getRevenueByWeekday(session.user.id, start, end),
      getAveragePaymentTime(session.user.id, start, end),
      getDailyPaymentCounts(session.user.id, start, end),
    ]);

  const totalVolume = data.volumeByDay.reduce((sum, d) => sum + d.volume, 0);
  const totalTransactions = data.volumeByDay.reduce(
    (sum, d) => sum + d.count,
    0
  );
  const avgValue = totalTransactions > 0 ? totalVolume / totalTransactions : 0;
  const hasData = totalTransactions > 0;

  const values = {
    volume: formatCurrency(totalVolume),
    transactions: totalTransactions.toLocaleString(),
    avg: formatCurrency(avgValue),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-lg font-semibold text-foreground">
            Analytics
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Insights into your payment activity
          </p>
        </div>
        <Suspense>
          <DateRangeSelector />
        </Suspense>
      </div>

      {hasData ? (
        <>
          {/* Summary stat cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {summaryCards.map((card) => (
              <div
                key={card.key}
                className="flex items-start gap-4 rounded-xl border border-border bg-background p-5"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
                  <card.icon className={`h-[18px] w-[18px] ${card.iconColor}`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted">
                    {card.label}
                  </p>
                  <p className="mt-1 font-heading text-xl font-semibold tabular-nums text-foreground">
                    {values[card.key]}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Existing charts (volume, crypto breakdown, status distribution) */}
          <AnalyticsCharts data={data} />

          {/* Separator */}
          <div className="relative py-2">
            <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
            <div className="relative mx-auto w-fit bg-background px-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                Deep Analytics
              </p>
            </div>
          </div>

          {/* Extended analytics: funnel, geo, weekday, avg time, daily activity */}
          <AnalyticsExtended
            funnel={funnel}
            chainDistribution={chainDistribution}
            weekdayRevenue={weekdayRevenue}
            avgPaymentTime={avgPaymentTime}
            dailyCounts={dailyCounts}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background py-20">
          <BarChart3
            size={32}
            className="text-muted"
            strokeWidth={1.5}
          />
          <p className="mt-4 text-sm font-medium text-foreground-secondary">
            No payment data for this period
          </p>
          <p className="mt-1 text-xs text-muted">
            Transactions will appear here once payments are processed.
          </p>
        </div>
      )}
    </div>
  );
}
