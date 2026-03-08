"use client";

import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
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
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background py-20">
        <BarChart3
          size={32}
          className="text-muted"
          strokeWidth={1.5}
        />
        <p className="mt-4 text-sm font-medium text-foreground-secondary">
          No payment data yet
        </p>
        <p className="mt-1 text-xs text-muted">
          Transactions will appear here once payments are processed.
        </p>
      </div>
    </div>
  );
}
