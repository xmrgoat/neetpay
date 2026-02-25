"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";

interface Props {
  volumeByDay: { date: string; volume: number; count: number }[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short" }).charAt(0);
}

function formatDateFull(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDollar(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function VolumeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-elevated px-3 py-2 shadow-lg">
      <p className="text-[11px] text-muted">{formatDateFull(label)}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
        {formatDollar(payload[0].value)}
      </p>
    </div>
  );
}

export function OverviewCharts({ volumeByDay }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-64 animate-pulse-subtle rounded-lg bg-surface" />
    );
  }

  if (volumeByDay.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-xs text-muted">No volume data yet</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={volumeByDay}
          margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
        >
          <CartesianGrid
            horizontal
            vertical={false}
            stroke="var(--border)"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickFormatter={formatDate}
            tickMargin={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickFormatter={formatDollar}
            tickMargin={4}
          />
          <RechartsTooltip
            content={<VolumeTooltip />}
            cursor={{ fill: "var(--border)", opacity: 0.3 }}
          />
          <Bar
            dataKey="volume"
            fill="var(--primary)"
            radius={[3, 3, 0, 0]}
            barSize={16}
            opacity={0.85}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
