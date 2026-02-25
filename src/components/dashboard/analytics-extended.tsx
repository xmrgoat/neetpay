"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
} from "recharts";
import { Clock, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConversionFunnelProps {
  created: number;
  confirming: number;
  paid: number;
}

interface ChainDistributionProps {
  chains: { chain: string; count: number; volume: number }[];
}

interface WeekdayRevenueProps {
  weekdays: { label: string; revenue: number; count: number }[];
}

interface AvgPaymentTimeProps {
  avgMinutes: number;
  count: number;
}

interface DailyCountsProps {
  data: { date: string; created: number; paid: number }[];
}

export interface ExtendedAnalyticsProps {
  funnel: ConversionFunnelProps;
  chainDistribution: ChainDistributionProps["chains"];
  weekdayRevenue: WeekdayRevenueProps["weekdays"];
  avgPaymentTime: AvgPaymentTimeProps;
  dailyCounts: DailyCountsProps["data"];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDollar(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTimeHuman(minutes: number): string {
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours < 24) {
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

const CHAIN_LABELS: Record<string, string> = {
  evm: "Ethereum / EVM",
  solana: "Solana",
  bitcoin: "Bitcoin",
  tron: "Tron",
  monero: "Monero",
};

const CHAIN_COLORS: Record<string, string> = {
  evm: "#627EEA",
  solana: "#9945FF",
  bitcoin: "#F7931A",
  tron: "#FF0013",
  monero: "#FF6600",
};

// ---------------------------------------------------------------------------
// Tooltips
// ---------------------------------------------------------------------------

function WeekdayTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-elevated p-3 shadow-lg">
      <p className="text-xs font-medium text-foreground">{d.label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-foreground">
        {formatDollar(d.revenue)}
      </p>
      <p className="text-xs text-muted">
        {d.count} payment{d.count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

function DailyCountTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-elevated p-3 shadow-lg">
      <p className="text-xs text-muted">{formatDate(label)}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="mt-0.5 font-mono text-xs text-foreground">
          <span className="capitalize">{p.dataKey}</span>: {p.value}
        </p>
      ))}
    </div>
  );
}

function ChainTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-elevated p-3 shadow-lg">
      <p className="text-xs font-medium text-foreground">
        {CHAIN_LABELS[d.chain] ?? d.chain}
      </p>
      <p className="mt-1 font-mono text-sm font-semibold text-foreground">
        {formatDollar(d.volume)}
      </p>
      <p className="text-xs text-muted">
        {d.count} payment{d.count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ExtendedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={cn(
            "rounded-xl border border-border bg-background p-5",
            i === 4 && "lg:col-span-2"
          )}
        >
          <div className="mb-2 h-4 w-32 animate-pulse rounded bg-border" />
          <div className="mb-6 h-3 w-48 animate-pulse rounded bg-border" />
          <div className="h-48 animate-pulse rounded-lg bg-border/40" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function AnalyticsExtended(props: ExtendedAnalyticsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <ExtendedSkeleton />;

  return <ExtendedContent {...props} />;
}

// ---------------------------------------------------------------------------
// Content (only after mount)
// ---------------------------------------------------------------------------

function ExtendedContent({
  funnel,
  chainDistribution,
  weekdayRevenue,
  avgPaymentTime,
  dailyCounts,
}: ExtendedAnalyticsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      const cards = containerRef.current.querySelectorAll("[data-ext-card]");
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

  const hasFunnel = funnel.created > 0;
  const hasChains = chainDistribution.length > 0;
  const hasWeekday = weekdayRevenue.some((d) => d.revenue > 0);
  const hasDailyCounts = dailyCounts.length > 0;

  return (
    <div ref={containerRef} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* ---------------------------------------------------------------
          Conversion Funnel — full section
          --------------------------------------------------------------- */}
      <div
        data-ext-card
        className="rounded-xl border border-border bg-background p-5 opacity-0"
      >
        <p className="text-sm font-medium text-foreground">Conversion Funnel</p>
        <p className="mt-0.5 text-xs text-muted">
          Payment flow: Created to Paid
        </p>

        {hasFunnel ? (
          <div className="mt-5">
            <FunnelVisualization
              created={funnel.created}
              confirming={funnel.confirming}
              paid={funnel.paid}
            />
          </div>
        ) : (
          <EmptyChart message="No payment data for this period" />
        )}
      </div>

      {/* ---------------------------------------------------------------
          Chain Distribution — bar chart
          --------------------------------------------------------------- */}
      <div
        data-ext-card
        className="rounded-xl border border-border bg-background p-5 opacity-0"
      >
        <p className="text-sm font-medium text-foreground">
          Chain Distribution
        </p>
        <p className="mt-0.5 text-xs text-muted">
          Payment volume by blockchain
        </p>

        {hasChains ? (
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chainDistribution.map((c) => ({
                  ...c,
                  label: CHAIN_LABELS[c.chain] ?? c.chain,
                }))}
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
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#737373" }}
                  width={90}
                />
                <RechartsTooltip
                  content={<ChainTooltip />}
                  cursor={{ fill: "var(--border)", opacity: 0.15 }}
                />
                <Bar dataKey="volume" radius={[0, 4, 4, 0]} barSize={18}>
                  {chainDistribution.map((entry) => (
                    <Cell
                      key={entry.chain}
                      fill={CHAIN_COLORS[entry.chain] ?? "#737373"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="No chain data for this period" />
        )}
      </div>

      {/* ---------------------------------------------------------------
          Revenue by Day of Week — bar chart
          --------------------------------------------------------------- */}
      <div
        data-ext-card
        className="rounded-xl border border-border bg-background p-5 opacity-0"
      >
        <p className="text-sm font-medium text-foreground">
          Revenue by Weekday
        </p>
        <p className="mt-0.5 text-xs text-muted">
          Which days generate the most revenue
        </p>

        {hasWeekday ? (
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weekdayRevenue}
                margin={{ top: 4, right: 4, bottom: 0, left: -12 }}
              >
                <CartesianGrid
                  horizontal
                  vertical={false}
                  stroke="var(--border)"
                  strokeOpacity={0.3}
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#737373" }}
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
                  content={<WeekdayTooltip />}
                  cursor={{ fill: "var(--border)", opacity: 0.15 }}
                />
                <Bar
                  dataKey="revenue"
                  fill="var(--primary)"
                  radius={[3, 3, 0, 0]}
                  barSize={28}
                  opacity={0.85}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="No revenue data for this period" />
        )}
      </div>

      {/* ---------------------------------------------------------------
          Average Payment Time — stat card
          --------------------------------------------------------------- */}
      <div
        data-ext-card
        className="rounded-xl border border-border bg-background p-5 opacity-0"
      >
        <p className="text-sm font-medium text-foreground">
          Average Payment Time
        </p>
        <p className="mt-0.5 text-xs text-muted">
          From creation to completion
        </p>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-warning-muted">
            <Clock className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="font-heading text-3xl font-semibold tabular-nums text-foreground">
              {avgPaymentTime.count > 0
                ? formatTimeHuman(avgPaymentTime.avgMinutes)
                : "--"}
            </p>
            <p className="text-xs text-muted">
              {avgPaymentTime.count > 0
                ? `Across ${avgPaymentTime.count} payment${avgPaymentTime.count !== 1 ? "s" : ""}`
                : "No completed payments yet"}
            </p>
          </div>
        </div>

        {/* Time context bar */}
        {avgPaymentTime.count > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span>Instant</span>
              <span>1h</span>
              <span>24h+</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-warning transition-all duration-700"
                style={{
                  width: `${Math.min(
                    Math.max(
                      (avgPaymentTime.avgMinutes / (24 * 60)) * 100,
                      3
                    ),
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------
          Daily Payment Activity — line chart (full width)
          --------------------------------------------------------------- */}
      <div
        data-ext-card
        className="rounded-xl border border-border bg-background p-5 opacity-0 lg:col-span-2"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-muted">
            <MousePointerClick className="h-4 w-4 text-info" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Daily Activity
            </p>
            <p className="text-xs text-muted">
              Payments created vs completed over time
            </p>
          </div>
        </div>

        {hasDailyCounts ? (
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dailyCounts}
                margin={{ top: 4, right: 4, bottom: 0, left: -12 }}
              >
                <defs>
                  <linearGradient
                    id="createdGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--info)"
                      stopOpacity={0.1}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--info)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="paidGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--success)"
                      stopOpacity={0.1}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--success)"
                      stopOpacity={0}
                    />
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
                  tickMargin={4}
                  allowDecimals={false}
                />
                <RechartsTooltip
                  content={<DailyCountTooltip />}
                  cursor={{
                    stroke: "var(--border)",
                    strokeDasharray: "4 4",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  stroke="var(--info)"
                  strokeWidth={2}
                  fill="url(#createdGradient)"
                  dot={false}
                  activeDot={{
                    r: 3,
                    fill: "var(--info)",
                    stroke: "var(--elevated)",
                    strokeWidth: 2,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="paid"
                  stroke="var(--success)"
                  strokeWidth={2}
                  fill="url(#paidGradient)"
                  dot={false}
                  activeDot={{
                    r: 3,
                    fill: "var(--success)",
                    stroke: "var(--elevated)",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="mt-3 flex items-center gap-5">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-info" />
                <span className="text-[11px] text-muted">Created</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="text-[11px] text-muted">Paid</span>
              </div>
            </div>
          </div>
        ) : (
          <EmptyChart message="No activity data for this period" />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Funnel Visualization — stepped bars with conversion arrows
// ---------------------------------------------------------------------------

function FunnelVisualization({
  created,
  confirming,
  paid,
}: ConversionFunnelProps) {
  const stages = [
    { label: "Created", count: created, color: "bg-info", colorHex: "var(--info)" },
    { label: "Engaged", count: confirming, color: "bg-warning", colorHex: "var(--warning)" },
    { label: "Paid", count: paid, color: "bg-success", colorHex: "var(--success)" },
  ];

  const maxCount = Math.max(created, 1);

  return (
    <div className="space-y-1">
      {stages.map((stage, i) => {
        const widthPct = (stage.count / maxCount) * 100;
        const prevCount = i > 0 ? stages[i - 1].count : null;
        const convRate =
          prevCount && prevCount > 0
            ? ((stage.count / prevCount) * 100).toFixed(1)
            : null;

        return (
          <div key={stage.label}>
            {/* Conversion arrow between stages */}
            {convRate && (
              <div className="flex items-center gap-2 py-1.5 pl-2">
                <div className="h-3 w-px bg-border" />
                <span className="font-mono text-[10px] text-muted">
                  {convRate}% conversion
                </span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <span className="w-16 text-xs text-foreground-secondary">
                {stage.label}
              </span>
              <div className="flex-1">
                <div className="h-7 overflow-hidden rounded bg-surface">
                  <div
                    className={cn(
                      "flex h-full items-center rounded px-2 transition-all duration-700",
                      stage.color
                    )}
                    style={{
                      width: `${Math.max(widthPct, 8)}%`,
                      opacity: 0.8,
                    }}
                  >
                    <span className="font-mono text-[11px] font-medium text-white">
                      {stage.count.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <span className="w-12 text-right font-mono text-[11px] text-muted tabular-nums">
                {((stage.count / maxCount) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="mt-4 flex h-48 items-center justify-center rounded-lg border border-dashed border-border">
      <p className="text-xs text-muted">{message}</p>
    </div>
  );
}

