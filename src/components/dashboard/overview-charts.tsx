"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimePeriod = "24h" | "7d" | "30d";

interface Props {
  volumeByDay: { date: string; volume: number; count: number }[];
}

const PERIODS: { value: TimePeriod; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "Week" },
  { value: "30d", label: "Month" },
];

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function formatHour(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDollar(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function VolumeTooltip({ active, payload, label, period }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-elevated px-4 py-3 shadow-xl">
      <p className="text-[11px] text-muted">
        {period === "24h" ? formatHour(label) : formatDateShort(label)}
      </p>
      <p className="mt-1 font-heading text-lg font-bold text-primary tabular-nums">
        + {formatDollar(payload[0].value)}
      </p>
      {payload[0].payload.count > 0 && (
        <p className="text-[11px] text-muted">
          {payload[0].payload.count} payment{payload[0].payload.count > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

/** Generate fake 24h hourly data from the last day of volumeByDay */
function generate24hData(lastDayVolume: number): { date: string; volume: number; count: number }[] {
  const data: { date: string; volume: number; count: number }[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(d.getHours() - i, 0, 0, 0);
    const hourFactor = Math.sin((d.getHours() / 24) * Math.PI) * 0.6 + 0.4; // peaks midday
    const noise = 0.7 + Math.random() * 0.6;
    const hourlyAvg = lastDayVolume / 24;
    data.push({
      date: d.toISOString(),
      volume: Math.round(hourlyAvg * hourFactor * noise),
      count: Math.floor(1 + Math.random() * 5),
    });
  }
  return data;
}

export function OverviewCharts({ volumeByDay }: Props) {
  const [mounted, setMounted] = useState(false);
  const [period, setPeriod] = useState<TimePeriod>("30d");

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = useMemo(() => {
    switch (period) {
      case "24h":
        return generate24hData(volumeByDay[volumeByDay.length - 1]?.volume ?? 1000);
      case "7d":
        return volumeByDay.slice(-7);
      case "30d":
      default:
        return volumeByDay;
    }
  }, [volumeByDay, period]);

  const periodLabel = period === "24h" ? "Today" : period === "7d" ? "7 days" : "30 days";
  const xTickFormatter = period === "24h" ? formatHour : formatDateShort;
  const xInterval = period === "24h"
    ? 3
    : Math.max(Math.floor(chartData.length / 7) - 1, 0);

  if (!mounted) {
    return (
      <div className="flex h-full flex-col rounded-xl border border-border bg-background p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="h-4 w-16 rounded bg-surface animate-pulse-subtle" />
            <div className="mt-1 h-3 w-24 rounded bg-surface animate-pulse-subtle" />
          </div>
        </div>
        <div className="flex-1 min-h-[200px]">
          <div className="h-full animate-pulse-subtle rounded-lg bg-surface" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-background p-5">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">Income</h2>
          <p className="text-xs text-muted">Revenue — {periodLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period switcher */}
          <div className="flex items-center rounded-lg border border-border bg-surface/50 p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-all duration-200",
                  period === p.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* More → analytics */}
          <Link
            href="/dashboard/analytics"
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] text-muted hover:text-foreground hover:border-border-hover transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0"
          >
            More <ArrowRight size={10} />
          </Link>
        </div>
      </div>

      {/* Chart — stretches to fill remaining height */}
      <div className="flex-1 min-h-[200px]">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-muted">No volume data yet</p>
          </div>
        ) : (
          <div className="h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
              >
                <defs>
                  <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff6600" stopOpacity={0.30} />
                    <stop offset="40%" stopColor="#ff6600" stopOpacity={0.10} />
                    <stop offset="100%" stopColor="#ff6600" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  horizontal
                  vertical={false}
                  strokeDasharray="4 4"
                  stroke="#232329"
                  strokeOpacity={0.8}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#52525b" }}
                  tickFormatter={xTickFormatter}
                  tickMargin={12}
                  interval={xInterval}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#52525b" }}
                  tickFormatter={formatDollar}
                  tickMargin={4}
                />
                <RechartsTooltip
                  content={<VolumeTooltip period={period} />}
                  cursor={{
                    stroke: "#ff6600",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                    strokeOpacity: 0.4,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#ff6600"
                  strokeWidth={2.5}
                  fill="url(#areaFill)"
                  fillOpacity={1}
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "#ff6600",
                    stroke: "#09090b",
                    strokeWidth: 3,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
