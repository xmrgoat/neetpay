"use client";

import { OverviewHero } from "@/components/dashboard/overview-hero";
import { OverviewCharts } from "@/components/dashboard/overview-charts";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { LivePulse } from "@/components/dashboard/live-pulse";

const EMPTY_STATS = {
  todayRevenue: 0,
  weekRevenue: 0,
  monthRevenue: 0,
  totalRevenue: 0,
  paymentCount: 0,
  paymentChange: 0,
  conversionRate: 0,
  avgPayment: 0,
  avgChange: 0,
  pendingCount: 0,
  pendingPayout: 0,
  paymentMethods: [],
};

const EMPTY_SPARKLINES = {
  paymentCounts: [],
  conversionRates: [],
  avgPayments: [],
  activeLinkCounts: [],
};

export default function DashboardPage() {
  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pb-4 no-scrollbar">
      {/* Live status bar */}
      <LivePulse
        pendingCount={0}
        confirmingCount={0}
        lastPaymentAge={undefined}
      />

      {/* Hero -- revenue + KPIs + status */}
      <OverviewHero
        today={EMPTY_STATS.todayRevenue}
        week={EMPTY_STATS.weekRevenue}
        month={EMPTY_STATS.monthRevenue}
        total={EMPTY_STATS.totalRevenue}
        payments={EMPTY_STATS.paymentCount}
        paymentsChange={EMPTY_STATS.paymentChange}
        conversionRate={EMPTY_STATS.conversionRate}
        avgPayment={EMPTY_STATS.avgPayment}
        avgChange={EMPTY_STATS.avgChange}
        activeLinks={EMPTY_STATS.pendingCount}
        pendingPayout={EMPTY_STATS.pendingPayout}
        pendingCount={EMPTY_STATS.pendingCount}
        successRate={EMPTY_STATS.conversionRate}
        paymentMethods={EMPTY_STATS.paymentMethods}
        sparklines={EMPTY_SPARKLINES}
      />

      {/* Chart */}
      <OverviewCharts volumeByDay={[]} />

      {/* Activity feed */}
      <ActivityFeed transactions={[]} />
    </div>
  );
}
