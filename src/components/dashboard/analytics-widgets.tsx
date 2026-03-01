"use client";

// ---------------------------------------------------------------------------
// Individual widget renderers for the analytics grid
// Each function takes the full server data bag and renders its widget content.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
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
import {
  DollarSign,
  Hash,
  TrendingUp,
  TrendingDown,
  Timer,
  CheckCircle2,
  XCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  BarChart3,
  Trophy,
  MousePointerClick,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Shared data type — passed from the server page to the grid
// ---------------------------------------------------------------------------

export interface AnalyticsWidgetData {
  totalVolume: number;
  totalTransactions: number;
  avgValue: number;
  periodComparison: { volumeChange: number; countChange: number };
  successMetrics: {
    total: number;
    paid: number;
    failed: number;
    expired: number;
    refunded: number;
    underpaid: number;
    successRate: number;
    failureRate: number;
    expiredRate: number;
    refundRate: number;
    underpaidRate: number;
  };
  avgPaymentTime: { avgMinutes: number; count: number };
  data: {
    volumeByDay: { date: string; volume: number; count: number }[];
    cryptoBreakdown: { crypto: string; volume: number; count: number }[];
    statusBreakdown: { status: string; count: number }[];
  };
  funnel: { created: number; confirming: number; paid: number };
  chainDistribution: { chain: string; count: number; volume: number }[];
  weekdayRevenue: { label: string; revenue: number; count: number }[];
  dailyCounts: { date: string; created: number; paid: number }[];
  amountDistribution: { label: string; count: number }[];
  topCurrencies: { currency: string; volume: number; count: number; percentage: number }[];
  hourlyHeatmap: number[][];
}

// ---------------------------------------------------------------------------
// Helpers (duplicated from analytics-charts/extended to keep this self-contained)
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours < 24) return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

// Color maps
const CRYPTO_COLORS: Record<string, string> = {
  BTC: "#F7931A", ETH: "#627EEA", SOL: "#9945FF", XMR: "#FF6600",
  TRX: "#FF0013", BNB: "#F3BA2F", USDT: "#26A17B", USDC: "#2775CA",
  LTC: "#345D9D", DOGE: "#C2A633", AVAX: "#E84142", ARB: "#28A0F0",
  OP: "#FF0420", MATIC: "#8247E5",
};

const STATUS_COLORS: Record<string, string> = {
  paid: "#22c55e", pending: "#eab308", confirming: "#3b82f6",
  expired: "#737373", failed: "#ef4444", underpaid: "#FF6600", refunded: "#a855f7",
};

const CHAIN_LABELS: Record<string, string> = {
  evm: "Ethereum / EVM", solana: "Solana", bitcoin: "Bitcoin",
  tron: "Tron", monero: "Monero", litecoin: "Litecoin", dogecoin: "Dogecoin",
};

const CHAIN_COLORS: Record<string, string> = {
  evm: "#627EEA", solana: "#9945FF", bitcoin: "#F7931A",
  tron: "#FF0013", monero: "#FF6600", litecoin: "#345D9D", dogecoin: "#C2A633",
};

const HEATMAP_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HEATMAP_HOURS = Array.from({ length: 24 }, (_, i) =>
  i === 0 ? "12a" : i < 12 ? `${i}a` : i === 12 ? "12p" : `${i - 12}p`
);

// ---------------------------------------------------------------------------
// Tooltips
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
      <p className="mt-1 font-mono text-sm font-semibold text-foreground">{formatDollar(d.volume)}</p>
      <p className="text-xs text-muted">{d.count} payment{d.count !== 1 ? "s" : ""}</p>
    </div>
  );
}

function StatusTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-elevated p-3 shadow-lg">
      <p className="text-xs capitalize text-foreground">{d.status}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-foreground">{d.count}</p>
    </div>
  );
}

function WeekdayTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-elevated p-3 shadow-lg">
      <p className="text-xs font-medium text-foreground">{d.label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-foreground">{formatDollar(d.revenue)}</p>
      <p className="text-xs text-muted">{d.count} payment{d.count !== 1 ? "s" : ""}</p>
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
      <p className="text-xs font-medium text-foreground">{CHAIN_LABELS[d.chain] ?? d.chain}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-foreground">{formatDollar(d.volume)}</p>
      <p className="text-xs text-muted">{d.count} payment{d.count !== 1 ? "s" : ""}</p>
    </div>
  );
}

function BucketTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-elevated p-3 shadow-lg">
      <p className="text-xs font-medium text-foreground">{d.label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-foreground">{d.count} payment{d.count !== 1 ? "s" : ""}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Change indicator
// ---------------------------------------------------------------------------

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${positive ? "text-success" : "text-error"}`}>
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// Empty state for charts
// ---------------------------------------------------------------------------

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[120px] items-center justify-center rounded-lg border border-dashed border-border">
      <p className="text-xs text-muted">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recharts mount guard — prevents hydration errors
// ---------------------------------------------------------------------------

function useChartMount() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

// ---------------------------------------------------------------------------
// KPI Widget Renderers
// ---------------------------------------------------------------------------

export function KpiVolumeWidget({ d }: { d: AnalyticsWidgetData }) {
  return (
    <div className="flex h-full items-start gap-4 p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-muted">
        <DollarSign className="h-[18px] w-[18px] text-primary" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted">Total Volume</p>
        <p className="mt-1 font-heading text-xl font-semibold tabular-nums text-foreground">
          {formatCurrency(d.totalVolume)}
        </p>
        <ChangeIndicator value={d.periodComparison.volumeChange} />
      </div>
    </div>
  );
}

export function KpiTransactionsWidget({ d }: { d: AnalyticsWidgetData }) {
  return (
    <div className="flex h-full items-start gap-4 p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info-muted">
        <Hash className="h-[18px] w-[18px] text-info" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted">Transactions</p>
        <p className="mt-1 font-heading text-xl font-semibold tabular-nums text-foreground">
          {d.totalTransactions.toLocaleString()}
        </p>
        <ChangeIndicator value={d.periodComparison.countChange} />
      </div>
    </div>
  );
}

export function KpiAvgValueWidget({ d }: { d: AnalyticsWidgetData }) {
  return (
    <div className="flex h-full items-start gap-4 p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success-muted">
        <TrendingUp className="h-[18px] w-[18px] text-success" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted">Avg Value</p>
        <p className="mt-1 font-heading text-xl font-semibold tabular-nums text-foreground">
          {formatCurrency(d.avgValue)}
        </p>
      </div>
    </div>
  );
}

export function KpiAvgTimeWidget({ d }: { d: AnalyticsWidgetData }) {
  return (
    <div className="flex h-full items-start gap-4 p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning-muted">
        <Timer className="h-[18px] w-[18px] text-warning" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted">Avg Confirm Time</p>
        <p className="mt-1 font-heading text-xl font-semibold tabular-nums text-foreground">
          {d.avgPaymentTime.count > 0 ? formatTimeHuman(d.avgPaymentTime.avgMinutes) : "--"}
        </p>
        <span className="text-[11px] text-muted">{d.avgPaymentTime.count} completed</span>
      </div>
    </div>
  );
}

function RateKpiWidget({
  label,
  value,
  count,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  count: number;
  icon: typeof CheckCircle2;
  color: string;
}) {
  return (
    <div className="flex h-full items-center gap-3 px-4 py-3.5">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-${color}-muted`}>
        <Icon className={`h-4 w-4 text-${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-muted">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="font-heading text-lg font-semibold tabular-nums text-foreground">{value}</p>
          <span className="font-mono text-[10px] text-muted tabular-nums">({count})</span>
        </div>
      </div>
    </div>
  );
}

export function KpiSuccessRateWidget({ d }: { d: AnalyticsWidgetData }) {
  return <RateKpiWidget label="Success Rate" value={`${d.successMetrics.successRate}%`} count={d.successMetrics.paid} icon={CheckCircle2} color="success" />;
}

export function KpiFailureRateWidget({ d }: { d: AnalyticsWidgetData }) {
  return <RateKpiWidget label="Failure Rate" value={`${d.successMetrics.failureRate}%`} count={d.successMetrics.failed} icon={XCircle} color="error" />;
}

export function KpiExpiredWidget({ d }: { d: AnalyticsWidgetData }) {
  return <RateKpiWidget label="Expired" value={`${d.successMetrics.expiredRate}%`} count={d.successMetrics.expired} icon={Timer} color="warning" />;
}

export function KpiRefundRateWidget({ d }: { d: AnalyticsWidgetData }) {
  return <RateKpiWidget label="Refund Rate" value={`${d.successMetrics.refundRate}%`} count={d.successMetrics.refunded} icon={TrendingDown} color="info" />;
}

export function KpiUnderpaidWidget({ d }: { d: AnalyticsWidgetData }) {
  return <RateKpiWidget label="Underpaid" value={`${d.successMetrics.underpaidRate}%`} count={d.successMetrics.underpaid} icon={Activity} color="primary" />;
}

// ---------------------------------------------------------------------------
// Chart Widget Renderers
// ---------------------------------------------------------------------------

export function ChartVolumeWidget({ d }: { d: AnalyticsWidgetData }) {
  const mounted = useChartMount();
  const hasData = d.data.volumeByDay.length > 0;

  return (
    <div className="flex h-full flex-col p-5">
      <p className="text-sm font-medium text-foreground">Payment Volume</p>
      <p className="mt-0.5 text-xs text-muted">Daily transaction volume</p>
      {!mounted ? (
        <div className="mt-4 flex-1 animate-pulse rounded-lg bg-border/40" />
      ) : !hasData ? (
        <div className="mt-4 flex-1"><EmptyChart message="No data for this period" /></div>
      ) : (
        <div className="mt-4 flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.data.volumeByDay} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="wVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF6600" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#FF6600" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid horizontal vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#737373" }} tickFormatter={formatDate} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#737373" }} tickFormatter={(v) => formatDollar(v)} tickMargin={4} />
              <RechartsTooltip content={<VolumeTooltip />} cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }} />
              <Area type="monotone" dataKey="volume" stroke="#FF6600" strokeWidth={2} fill="url(#wVolumeGrad)" dot={false} activeDot={{ r: 4, fill: "#FF6600", stroke: "var(--elevated)", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function ChartCryptoWidget({ d }: { d: AnalyticsWidgetData }) {
  const mounted = useChartMount();
  const hasData = d.data.cryptoBreakdown.length > 0;

  return (
    <div className="flex h-full flex-col p-5">
      <p className="text-sm font-medium text-foreground">By Cryptocurrency</p>
      <p className="mt-0.5 text-xs text-muted">Revenue breakdown by currency</p>
      {!mounted ? (
        <div className="mt-4 flex-1 animate-pulse rounded-lg bg-border/40" />
      ) : !hasData ? (
        <div className="mt-4 flex-1"><EmptyChart message="No data for this period" /></div>
      ) : (
        <div className="mt-4 flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.data.cryptoBreakdown} layout="vertical" margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#737373" }} tickFormatter={(v) => formatDollar(v)} />
              <YAxis type="category" dataKey="crypto" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#737373" }} width={48} />
              <RechartsTooltip content={<CryptoTooltip />} cursor={{ fill: "var(--border)", opacity: 0.15 }} />
              <Bar dataKey="volume" radius={[0, 4, 4, 0]} barSize={20}>
                {d.data.cryptoBreakdown.map((entry) => (
                  <Cell key={entry.crypto} fill={CRYPTO_COLORS[entry.crypto.toUpperCase()] ?? "#737373"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function ChartStatusWidget({ d }: { d: AnalyticsWidgetData }) {
  const mounted = useChartMount();
  const hasData = d.data.statusBreakdown.length > 0;
  const total = d.data.statusBreakdown.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="flex h-full flex-col p-5">
      <p className="text-sm font-medium text-foreground">Status Distribution</p>
      <p className="mt-0.5 text-xs text-muted">Payment outcomes overview</p>
      {!mounted ? (
        <div className="mt-4 flex-1 animate-pulse rounded-lg bg-border/40" />
      ) : !hasData ? (
        <div className="mt-4 flex-1"><EmptyChart message="No data for this period" /></div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center sm:gap-12 min-h-0">
          <div className="relative h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={d.data.statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={2} stroke="none">
                  {d.data.statusBreakdown.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#737373"} />
                  ))}
                </Pie>
                <RechartsTooltip content={<StatusTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading text-2xl font-semibold text-foreground">{total}</span>
              <span className="text-xs text-muted">payment{total !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {d.data.statusBreakdown.map((entry) => {
              const pct = total > 0 ? ((entry.count / total) * 100).toFixed(1) : "0";
              return (
                <div key={entry.status} className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.status] ?? "#737373" }} />
                  <span className="text-xs capitalize text-foreground-secondary">{entry.status}</span>
                  <span className="ml-auto font-mono text-xs font-medium text-foreground">{entry.count}</span>
                  <span className="font-mono text-xs text-muted">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deep Analytics Widget Renderers
// ---------------------------------------------------------------------------

export function DeepFunnelWidget({ d }: { d: AnalyticsWidgetData }) {
  const { created, confirming, paid } = d.funnel;
  const hasFunnel = created > 0;
  const maxCount = Math.max(created, 1);
  const stages = [
    { label: "Created", count: created, color: "bg-info" },
    { label: "Engaged", count: confirming, color: "bg-warning" },
    { label: "Paid", count: paid, color: "bg-success" },
  ];

  return (
    <div className="flex h-full flex-col p-5">
      <p className="text-sm font-medium text-foreground">Conversion Funnel</p>
      <p className="mt-0.5 text-xs text-muted">Payment flow: Created to Paid</p>
      {!hasFunnel ? (
        <div className="mt-4 flex-1"><EmptyChart message="No payment data for this period" /></div>
      ) : (
        <div className="mt-5 space-y-1">
          {stages.map((stage, i) => {
            const widthPct = (stage.count / maxCount) * 100;
            const prevCount = i > 0 ? stages[i - 1].count : null;
            const convRate = prevCount && prevCount > 0 ? ((stage.count / prevCount) * 100).toFixed(1) : null;
            return (
              <div key={stage.label}>
                {convRate && (
                  <div className="flex items-center gap-2 py-1.5 pl-2">
                    <div className="h-3 w-px bg-border" />
                    <span className="font-mono text-[10px] text-muted">{convRate}% conversion</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="w-16 text-xs text-foreground-secondary">{stage.label}</span>
                  <div className="flex-1">
                    <div className="h-7 overflow-hidden rounded bg-surface">
                      <div className={cn("flex h-full items-center rounded px-2 transition-all duration-700", stage.color)} style={{ width: `${Math.max(widthPct, 8)}%`, opacity: 0.8 }}>
                        <span className="font-mono text-[11px] font-medium text-white">{stage.count.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <span className="w-12 text-right font-mono text-[11px] text-muted tabular-nums">{((stage.count / maxCount) * 100).toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DeepChainsWidget({ d }: { d: AnalyticsWidgetData }) {
  const mounted = useChartMount();
  const hasData = d.chainDistribution.length > 0;

  return (
    <div className="flex h-full flex-col p-5">
      <p className="text-sm font-medium text-foreground">Chain Distribution</p>
      <p className="mt-0.5 text-xs text-muted">Payment volume by blockchain</p>
      {!mounted ? (
        <div className="mt-4 flex-1 animate-pulse rounded-lg bg-border/40" />
      ) : !hasData ? (
        <div className="mt-4 flex-1"><EmptyChart message="No chain data for this period" /></div>
      ) : (
        <div className="mt-4 flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.chainDistribution.map((c) => ({ ...c, label: CHAIN_LABELS[c.chain] ?? c.chain }))} layout="vertical" margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#737373" }} tickFormatter={(v) => formatDollar(v)} />
              <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#737373" }} width={90} />
              <RechartsTooltip content={<ChainTooltip />} cursor={{ fill: "var(--border)", opacity: 0.15 }} />
              <Bar dataKey="volume" radius={[0, 4, 4, 0]} barSize={18}>
                {d.chainDistribution.map((entry) => (
                  <Cell key={entry.chain} fill={CHAIN_COLORS[entry.chain] ?? "#737373"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function DeepWeekdayWidget({ d }: { d: AnalyticsWidgetData }) {
  const mounted = useChartMount();
  const hasData = d.weekdayRevenue.some((r) => r.revenue > 0);

  return (
    <div className="flex h-full flex-col p-5">
      <p className="text-sm font-medium text-foreground">Revenue by Weekday</p>
      <p className="mt-0.5 text-xs text-muted">Which days generate the most revenue</p>
      {!mounted ? (
        <div className="mt-4 flex-1 animate-pulse rounded-lg bg-border/40" />
      ) : !hasData ? (
        <div className="mt-4 flex-1"><EmptyChart message="No revenue data for this period" /></div>
      ) : (
        <div className="mt-4 flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.weekdayRevenue} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
              <CartesianGrid horizontal vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#737373" }} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#737373" }} tickFormatter={(v) => formatDollar(v)} tickMargin={4} />
              <RechartsTooltip content={<WeekdayTooltip />} cursor={{ fill: "var(--border)", opacity: 0.15 }} />
              <Bar dataKey="revenue" fill="var(--primary)" radius={[3, 3, 0, 0]} barSize={28} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function DeepAvgTimeWidget({ d }: { d: AnalyticsWidgetData }) {
  return (
    <div className="flex h-full flex-col p-5">
      <p className="text-sm font-medium text-foreground">Average Payment Time</p>
      <p className="mt-0.5 text-xs text-muted">From creation to completion</p>
      <div className="mt-6 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-warning-muted">
          <Clock className="h-6 w-6 text-warning" />
        </div>
        <div>
          <p className="font-heading text-3xl font-semibold tabular-nums text-foreground">
            {d.avgPaymentTime.count > 0 ? formatTimeHuman(d.avgPaymentTime.avgMinutes) : "--"}
          </p>
          <p className="text-xs text-muted">
            {d.avgPaymentTime.count > 0 ? `Across ${d.avgPaymentTime.count} payment${d.avgPaymentTime.count !== 1 ? "s" : ""}` : "No completed payments yet"}
          </p>
        </div>
      </div>
      {d.avgPaymentTime.count > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-[11px] text-muted"><span>Instant</span><span>1h</span><span>24h+</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-warning transition-all duration-700" style={{ width: `${Math.min(Math.max((d.avgPaymentTime.avgMinutes / (24 * 60)) * 100, 3), 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export function DeepSizesWidget({ d }: { d: AnalyticsWidgetData }) {
  const mounted = useChartMount();
  const hasData = d.amountDistribution.some((b) => b.count > 0);

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-muted">
          <BarChart3 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Payment Sizes</p>
          <p className="text-xs text-muted">Distribution of payment amounts</p>
        </div>
      </div>
      {!mounted ? (
        <div className="mt-4 flex-1 animate-pulse rounded-lg bg-border/40" />
      ) : !hasData ? (
        <div className="mt-4 flex-1"><EmptyChart message="No distribution data" /></div>
      ) : (
        <div className="mt-4 flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.amountDistribution} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
              <CartesianGrid horizontal vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#737373" }} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#737373" }} tickMargin={4} allowDecimals={false} />
              <RechartsTooltip content={<BucketTooltip />} cursor={{ fill: "var(--border)", opacity: 0.15 }} />
              <Bar dataKey="count" fill="#FF6600" radius={[3, 3, 0, 0]} barSize={24} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function DeepCurrenciesWidget({ d }: { d: AnalyticsWidgetData }) {
  const hasData = d.topCurrencies.length > 0;

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-muted">
          <Trophy className="h-4 w-4 text-success" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Top Currencies</p>
          <p className="text-xs text-muted">Ranked by volume</p>
        </div>
      </div>
      {!hasData ? (
        <div className="mt-4 flex-1"><EmptyChart message="No currency data" /></div>
      ) : (
        <div className="mt-4 space-y-2 overflow-y-auto">
          {d.topCurrencies.map((c, i) => {
            const color = CRYPTO_COLORS[c.currency] ?? "#737373";
            return (
              <div key={c.currency} className="flex items-center gap-3">
                <span className="w-5 text-right font-mono text-[10px] text-muted tabular-nums">{i + 1}</span>
                <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="w-12 text-xs font-medium text-foreground">{c.currency}</span>
                <div className="flex-1">
                  <div className="h-5 overflow-hidden rounded bg-surface">
                    <div className="h-full rounded transition-all duration-700" style={{ width: `${Math.max(c.percentage, 4)}%`, backgroundColor: color, opacity: 0.7 }} />
                  </div>
                </div>
                <span className="w-16 text-right font-mono text-[11px] font-medium text-foreground tabular-nums">{formatDollar(c.volume)}</span>
                <span className="w-10 text-right font-mono text-[10px] text-muted tabular-nums">{c.percentage}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DeepDailyWidget({ d }: { d: AnalyticsWidgetData }) {
  const mounted = useChartMount();
  const hasData = d.dailyCounts.length > 0;

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-muted">
          <MousePointerClick className="h-4 w-4 text-info" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Daily Activity</p>
          <p className="text-xs text-muted">Payments created vs completed over time</p>
        </div>
      </div>
      {!mounted ? (
        <div className="mt-4 flex-1 animate-pulse rounded-lg bg-border/40" />
      ) : !hasData ? (
        <div className="mt-4 flex-1"><EmptyChart message="No activity data for this period" /></div>
      ) : (
        <div className="mt-4 flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.dailyCounts} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="wCreatedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--info)" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="var(--info)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="wPaidGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--success)" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid horizontal vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#737373" }} tickFormatter={formatDate} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#737373" }} tickMargin={4} allowDecimals={false} />
              <RechartsTooltip content={<DailyCountTooltip />} cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }} />
              <Area type="monotone" dataKey="created" stroke="var(--info)" strokeWidth={2} fill="url(#wCreatedGrad)" dot={false} activeDot={{ r: 3, fill: "var(--info)", stroke: "var(--elevated)", strokeWidth: 2 }} />
              <Area type="monotone" dataKey="paid" stroke="var(--success)" strokeWidth={2} fill="url(#wPaidGrad)" dot={false} activeDot={{ r: 3, fill: "var(--success)", stroke: "var(--elevated)", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-2 flex items-center gap-5">
            <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-info" /><span className="text-[11px] text-muted">Created</span></div>
            <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /><span className="text-[11px] text-muted">Paid</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DeepHeatmapWidget({ d }: { d: AnalyticsWidgetData }) {
  const heatmapMax = Math.max(1, ...d.hourlyHeatmap.flat());
  const hasData = d.hourlyHeatmap.flat().some((v) => v > 0);

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-muted">
          <LayoutGrid className="h-4 w-4 text-warning" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Activity Heatmap</p>
          <p className="text-xs text-muted">Payment frequency by hour and day of week</p>
        </div>
      </div>
      {!hasData ? (
        <div className="mt-4 flex-1"><EmptyChart message="No activity data for heatmap" /></div>
      ) : (
        <div className="mt-4 flex-1 overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="flex items-center ml-10 mb-1">
              {HEATMAP_HOURS.filter((_, i) => i % 3 === 0).map((h) => (
                <span key={h} className="text-[9px] text-muted tabular-nums" style={{ width: `${100 / 8}%` }}>{h}</span>
              ))}
            </div>
            {d.hourlyHeatmap.map((row, dayIdx) => (
              <div key={dayIdx} className="flex items-center gap-1 mb-0.5">
                <span className="w-8 text-right text-[10px] text-muted">{HEATMAP_DAYS[dayIdx]}</span>
                <div className="flex flex-1 gap-0.5">
                  {row.map((value, hourIdx) => {
                    const intensity = heatmapMax > 0 ? value / heatmapMax : 0;
                    return (
                      <div
                        key={hourIdx}
                        className="aspect-square flex-1 rounded-[3px] transition-colors"
                        style={{ backgroundColor: intensity === 0 ? "var(--surface)" : `rgba(255, 102, 0, ${0.15 + intensity * 0.75})` }}
                        title={`${HEATMAP_DAYS[dayIdx]} ${HEATMAP_HOURS[hourIdx]}: ${value} payment${value !== 1 ? "s" : ""}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-end gap-1.5">
              <span className="text-[9px] text-muted">Less</span>
              {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                <div key={v} className="h-3 w-3 rounded-[2px]" style={{ backgroundColor: v === 0 ? "var(--surface)" : `rgba(255, 102, 0, ${0.15 + v * 0.75})` }} />
              ))}
              <span className="text-[9px] text-muted">More</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Widget Renderer Map — maps widget ID to its render component
// ---------------------------------------------------------------------------

export const WIDGET_RENDERERS: Record<string, React.ComponentType<{ d: AnalyticsWidgetData }>> = {
  "kpi-volume": KpiVolumeWidget,
  "kpi-transactions": KpiTransactionsWidget,
  "kpi-avg-value": KpiAvgValueWidget,
  "kpi-avg-time": KpiAvgTimeWidget,
  "kpi-success-rate": KpiSuccessRateWidget,
  "kpi-failure-rate": KpiFailureRateWidget,
  "kpi-expired": KpiExpiredWidget,
  "kpi-refund-rate": KpiRefundRateWidget,
  "kpi-underpaid": KpiUnderpaidWidget,
  "chart-volume": ChartVolumeWidget,
  "chart-crypto": ChartCryptoWidget,
  "chart-status": ChartStatusWidget,
  "deep-funnel": DeepFunnelWidget,
  "deep-chains": DeepChainsWidget,
  "deep-weekday": DeepWeekdayWidget,
  "deep-avg-time": DeepAvgTimeWidget,
  "deep-sizes": DeepSizesWidget,
  "deep-currencies": DeepCurrenciesWidget,
  "deep-daily": DeepDailyWidget,
  "deep-heatmap": DeepHeatmapWidget,
};
