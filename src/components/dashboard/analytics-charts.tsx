"use client";

import dynamic from "next/dynamic";

const AreaChart = dynamic(
  () => import("recharts").then((mod) => mod.AreaChart),
  { ssr: false }
);
const Area = dynamic(
  () => import("recharts").then((mod) => mod.Area),
  { ssr: false }
);
const XAxis = dynamic(
  () => import("recharts").then((mod) => mod.XAxis),
  { ssr: false }
);
const YAxis = dynamic(
  () => import("recharts").then((mod) => mod.YAxis),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip),
  { ssr: false }
);
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);
const BarChart = dynamic(
  () => import("recharts").then((mod) => mod.BarChart),
  { ssr: false }
);
const Bar = dynamic(
  () => import("recharts").then((mod) => mod.Bar),
  { ssr: false }
);

const SAMPLE_VOLUME = [
  { date: "Jan", volume: 0 },
  { date: "Feb", volume: 0 },
  { date: "Mar", volume: 0 },
  { date: "Apr", volume: 0 },
  { date: "May", volume: 0 },
  { date: "Jun", volume: 0 },
];

const SAMPLE_CRYPTO = [
  { crypto: "XMR", count: 0 },
  { crypto: "BTC", count: 0 },
  { crypto: "ETH", count: 0 },
  { crypto: "USDT", count: 0 },
  { crypto: "SOL", count: 0 },
];

export function AnalyticsCharts() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Volume chart */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-foreground-secondary mb-6">
          Payment Volume
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={SAMPLE_VOLUME}>
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--foreground-secondary)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--foreground-secondary)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="volume"
                stroke="#ff6600"
                fill="#ff660020"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Crypto breakdown */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-foreground-secondary mb-6">
          By Cryptocurrency
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={SAMPLE_CRYPTO}>
              <XAxis
                dataKey="crypto"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--foreground-secondary)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--foreground-secondary)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="count" fill="#ff6600" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
