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
  getSuccessMetrics,
  getPeriodComparison,
  getAmountDistribution,
  getTopCurrencies,
  getHourlyHeatmap,
} from "@/lib/dashboard/queries";
import { DateRangeSelector } from "@/components/dashboard/date-range-selector";
import { WidgetGrid } from "@/components/dashboard/widget-grid";
import { BarChart3 } from "lucide-react";
import type { AnalyticsWidgetData } from "@/components/dashboard/analytics-widgets";

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

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const range = params.range || "30d";
  const { start, end } = getDateRange(range);

  const [
    data,
    funnel,
    chainDistribution,
    weekdayRevenue,
    avgPaymentTime,
    dailyCounts,
    successMetrics,
    periodComparison,
    amountDistribution,
    topCurrencies,
    hourlyHeatmap,
  ] = await Promise.all([
    getAnalyticsData(session.user.id, start, end),
    getConversionFunnel(session.user.id, start, end),
    getGeoDistribution(session.user.id, 10, start, end),
    getRevenueByWeekday(session.user.id, start, end),
    getAveragePaymentTime(session.user.id, start, end),
    getDailyPaymentCounts(session.user.id, start, end),
    getSuccessMetrics(session.user.id, start, end),
    getPeriodComparison(session.user.id, start, end),
    getAmountDistribution(session.user.id, start, end),
    getTopCurrencies(session.user.id, start, end),
    getHourlyHeatmap(session.user.id, start, end),
  ]);

  const totalVolume = data.volumeByDay.reduce((sum, d) => sum + d.volume, 0);
  const totalTransactions = data.volumeByDay.reduce((sum, d) => sum + d.count, 0);
  const avgValue = totalTransactions > 0 ? totalVolume / totalTransactions : 0;
  const hasData = totalTransactions > 0;

  // Build the unified data bag for all widgets
  const widgetData: AnalyticsWidgetData = {
    totalVolume,
    totalTransactions,
    avgValue,
    periodComparison,
    successMetrics,
    avgPaymentTime,
    data,
    funnel,
    chainDistribution,
    weekdayRevenue,
    dailyCounts,
    amountDistribution,
    topCurrencies,
    hourlyHeatmap,
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
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
        <WidgetGrid data={widgetData} />
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
