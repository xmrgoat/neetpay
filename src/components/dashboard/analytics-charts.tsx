"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ---------------------------------------------------------------------------
// Types — matches getAnalyticsData() return shape exactly
// ---------------------------------------------------------------------------

interface AnalyticsChartsProps {
  data: {
    volumeByDay: { date: string; volume: number; count: number }[];
    cryptoBreakdown: { crypto: string; volume: number; count: number }[];
    statusBreakdown: { status: string; count: number }[];
  };
}

// ---------------------------------------------------------------------------
// Color maps
// ---------------------------------------------------------------------------

const CRYPTO_COLORS: Record<string, string> = {
  BTC: "#F7931A",
  ETH: "#627EEA",
  SOL: "#9945FF",
  XMR: "#FF6600",
  TRX: "#FF0013",
  BNB: "#F3BA2F",
  USDT: "#26A17B",
  USDC: "#2775CA",
};

const STATUS_COLORS: Record<string, string> = {
  paid: "#22c55e",
  pending: "#eab308",
  confirming: "#3b82f6",
  expired: "#737373",
  failed: "#ef4444",
  underpaid: "#FF6600",
  refunded: "#a855f7",
};

const DEFAULT_COLOR = "#737373";

function getCryptoColor(key: string): string {
  return CRYPTO_COLORS[key.toUpperCase()] ?? DEFAULT_COLOR;
}

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? DEFAULT_COLOR;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDollar(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Custom tooltips
// ---------------------------------------------------------------------------

function VolumeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-elevated p-3 shadow-lg">
      <p className="text-xs text-muted">{formatDate(label)}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-foreground">
        {formatDollar(payload[0].value)}
      </p>
    </div>
  );
}

function CryptoTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-elevated p-3 shadow-lg">
      <p className="text-xs font-medium text-foreground">{d.crypto}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-foreground">
        {formatDollar(d.volume)}
      </p>
      <p className="text-xs text-muted">
        {d.count} payment{d.count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

function StatusTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-elevated p-3 shadow-lg">
      <p className="text-xs capitalize text-foreground">{d.status}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-foreground">
        {d.count}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton (shown while recharts hydrates on the client)
// ---------------------------------------------------------------------------

function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`rounded-xl border border-border bg-elevated p-6 ${
            i === 2 ? "lg:col-span-2" : ""
          }`}
        >
          <div className="mb-2 h-4 w-32 animate-pulse rounded bg-border" />
          <div className="mb-6 h-3 w-48 animate-pulse rounded bg-border" />
          <div className="h-64 animate-pulse rounded-lg bg-border/40" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export — gate rendering behind `mounted` so Recharts is client-only
// ---------------------------------------------------------------------------

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <ChartsSkeleton />;

  return <ChartsContent data={data} />;
}

// ---------------------------------------------------------------------------
// Charts content (only rendered after mount)
// ---------------------------------------------------------------------------

function ChartsContent({ data }: AnalyticsChartsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const hasVolume = data.volumeByDay.length > 0;
  const hasCrypto = data.cryptoBreakdown.length > 0;
  const hasStatus = data.statusBreakdown.length > 0;

  const totalPayments = data.statusBreakdown.reduce(
    (sum, s) => sum + s.count,
    0
  );

  // GSAP stagger animation on mount
  useGSAP(
    () => {
      if (!containerRef.current) return;
      const cards = containerRef.current.querySelectorAll("[data-chart-card]");
      if (!cards.length) return;

      gsap.fromTo(
        cards,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.1,
          ease: "power3.out",
        }
      );
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-1 gap-6 lg:grid-cols-2"
    >
      {/* ---------------------------------------------------------------
          Chart 1: Volume Over Time (Area Chart)
          --------------------------------------------------------------- */}
      <div
        data-chart-card
        className="rounded-xl border border-border bg-background p-5 opacity-0"
      >
        <p className="text-sm font-medium text-foreground">Payment Volume</p>
        <p className="mt-0.5 text-xs text-muted">
          Daily transaction volume
        </p>

        {hasVolume ? (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.volumeByDay}
                margin={{ top: 4, right: 4, bottom: 0, left: -12 }}
              >
                <defs>
                  <linearGradient
                    id="volumeGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#FF6600" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#FF6600" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  horizontal
                  vertical={false}
                  stroke="var(--border)"
                  strokeOpacity={0.3}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#737373" }}
                  tickFormatter={formatDate}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#737373" }}
                  tickFormatter={(v) => formatDollar(v)}
                  tickMargin={4}
                />
                <RechartsTooltip
                  content={<VolumeTooltip />}
                  cursor={{
                    stroke: "var(--border)",
                    strokeDasharray: "4 4",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#FF6600"
                  strokeWidth={2}
                  fill="url(#volumeGradient)"
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: "#FF6600",
                    stroke: "var(--elevated)",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyChart message="No data for this period" />
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------
          Chart 2: Revenue by Cryptocurrency (Horizontal Bar Chart)
          --------------------------------------------------------------- */}
      <div
        data-chart-card
        className="rounded-xl border border-border bg-background p-5 opacity-0"
      >
        <p className="text-sm font-medium text-foreground">
          By Cryptocurrency
        </p>
        <p className="mt-0.5 text-xs text-muted">
          Revenue breakdown by currency
        </p>

        {hasCrypto ? (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.cryptoBreakdown}
                layout="vertical"
                margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
              >
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#737373" }}
                  tickFormatter={(v) => formatDollar(v)}
                />
                <YAxis
                  type="category"
                  dataKey="crypto"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#737373" }}
                  width={48}
                />
                <RechartsTooltip
                  content={<CryptoTooltip />}
                  cursor={{ fill: "var(--border)", opacity: 0.15 }}
                />
                <Bar dataKey="volume" radius={[0, 4, 4, 0]} barSize={20}>
                  {data.cryptoBreakdown.map((entry) => (
                    <Cell
                      key={entry.crypto}
                      fill={getCryptoColor(entry.crypto)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyChart message="No data for this period" />
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------
          Chart 3: Payment Status Distribution (Donut Chart)
          --------------------------------------------------------------- */}
      <div
        data-chart-card
        className="rounded-xl border border-border bg-background p-5 opacity-0 lg:col-span-2"
      >
        <p className="text-sm font-medium text-foreground">
          Status Distribution
        </p>
        <p className="mt-0.5 text-xs text-muted">
          Payment outcomes overview
        </p>

        {hasStatus ? (
          <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center sm:gap-12">
            {/* Donut chart */}
            <div className="relative h-56 w-56 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusBreakdown}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="80%"
                    paddingAngle={2}
                    stroke="none"
                  >
                    {data.statusBreakdown.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={getStatusColor(entry.status)}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<StatusTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-heading text-2xl font-semibold text-foreground">
                  {totalPayments}
                </span>
                <span className="text-xs text-muted">
                  payment{totalPayments !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {data.statusBreakdown.map((entry) => {
                const pct =
                  totalPayments > 0
                    ? ((entry.count / totalPayments) * 100).toFixed(1)
                    : "0";
                return (
                  <div key={entry.status} className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: getStatusColor(entry.status),
                      }}
                    />
                    <span className="text-xs capitalize text-foreground-secondary">
                      {entry.status}
                    </span>
                    <span className="ml-auto font-mono text-xs font-medium text-foreground">
                      {entry.count}
                    </span>
                    <span className="font-mono text-xs text-muted">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyChart message="No data for this period" />
          </div>
        )}
      </div>
    </div>
  );
}
