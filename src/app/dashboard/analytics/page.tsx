import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Monitor your payment volume and crypto breakdown.
        </p>
      </div>

      <AnalyticsCharts />
    </div>
  );
}
