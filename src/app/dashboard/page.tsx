import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RevenueSummary } from "@/components/dashboard/revenue-summary";
import { OverviewCharts } from "@/components/dashboard/overview-charts";
import { DashboardRightColumn } from "@/components/dashboard/dashboard-right-column";
import { OverviewKpis } from "@/components/dashboard/overview-kpis";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PaymentStatus } from "@/lib/constants";

// ─── Fake data ──────────────────────────────────────────────────────────────

const fakeRevenue = {
  today: 3_420,
  week: 79_902,
  month: 137_922,
  total: 542_810,
};

function generateVolumeByDay() {
  const days: { date: string; volume: number; count: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const base = 800 + Math.random() * 2200;
    const weekend = [0, 6].includes(d.getDay()) ? 0.6 : 1;
    days.push({
      date: d.toISOString().split("T")[0],
      volume: Math.round(base * weekend),
      count: Math.floor(5 + Math.random() * 25),
    });
  }
  return days;
}

const fakeVolumeByDay = generateVolumeByDay();

const fakeWallet = {
  totalUsd: 54_254.54,
  holdings: [
    { currency: "BTC", amount: 0.4218, usdValue: 28_420.80, price: 67_380, change24h: 2.34 },
    { currency: "ETH", amount: 3.8741, usdValue: 12_840.50, price: 3_315, change24h: -1.12 },
    { currency: "XMR", amount: 42.156, usdValue: 6_890.20, price: 163.50, change24h: 4.87 },
    { currency: "SOL", amount: 18.42, usdValue: 3_210.00, price: 174.26, change24h: 1.56 },
    { currency: "USDT", amount: 2_893.04, usdValue: 2_893.04, price: 1.00, change24h: 0.01 },
    { currency: "USDC", amount: 0, usdValue: 0, price: 1.00, change24h: 0.00 },
    { currency: "TRX", amount: 0, usdValue: 0, price: 0.124, change24h: -0.87 },
    { currency: "BNB", amount: 0, usdValue: 0, price: 608.30, change24h: 1.23 },
    { currency: "LTC", amount: 0, usdValue: 0, price: 84.50, change24h: -2.15 },
    { currency: "DOGE", amount: 0, usdValue: 0, price: 0.162, change24h: 5.42 },
    { currency: "TON", amount: 0, usdValue: 0, price: 5.82, change24h: 3.18 },
    { currency: "XRP", amount: 0, usdValue: 0, price: 0.62, change24h: -0.54 },
  ],
};

const fakeKpis = {
  payments: 1_247,
  paymentsChange: 12,
  conversionRate: 74.1,
  avgPayment: 435,
  avgChange: 8,
  activeLinks: 23,
};

const fakeRecentTxs = [
  { id: "tx_1", amount: 1_250.00, status: "paid" as const, trackId: "pay_8f3k2m9x4n1j", payCurrency: "BTC", createdAt: new Date(Date.now() - 12 * 60_000) },
  { id: "tx_2", amount: 89.99, status: "confirming" as const, trackId: "pay_2v7b4c8d1f6g", payCurrency: "ETH", createdAt: new Date(Date.now() - 34 * 60_000) },
  { id: "tx_3", amount: 450.00, status: "paid" as const, trackId: "pay_5t8r1q4w7e2y", payCurrency: "XMR", createdAt: new Date(Date.now() - 2.5 * 3600_000) },
  { id: "tx_4", amount: 2_100.00, status: "paid" as const, trackId: "pay_9m3n6b1v4c7x", payCurrency: "SOL", createdAt: new Date(Date.now() - 5 * 3600_000) },
  { id: "tx_5", amount: 34.50, status: "pending" as const, trackId: "pay_1a2s3d4f5g6h", payCurrency: "USDT", createdAt: new Date(Date.now() - 8 * 3600_000) },
  { id: "tx_6", amount: 780.00, status: "paid" as const, trackId: "pay_7k8l9m0n1o2p", payCurrency: "BTC", createdAt: new Date(Date.now() - 12 * 3600_000) },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const statusDot: Record<PaymentStatus, string> = {
  pending: "bg-amber-500", confirming: "bg-blue-500", paid: "bg-emerald-500",
  expired: "bg-neutral-400", failed: "bg-red-500", underpaid: "bg-orange-500", refunded: "bg-purple-500",
};
const statusLabel: Record<PaymentStatus, string> = {
  pending: "Pending", confirming: "Confirming", paid: "Paid",
  expired: "Expired", failed: "Failed", underpaid: "Underpaid", refunded: "Refunded",
};

function relativeTime(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : `${Math.floor(d / 30)}mo ago`;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="grid h-full grid-cols-1 gap-5 lg:grid-cols-12">

      {/* ── LEFT COLUMN : 9 cols — independently scrollable ── */}
      <div className="flex min-h-0 flex-col gap-5 overflow-y-auto lg:col-span-9 lg:border-r lg:border-border/40 lg:pr-5 pb-4 no-scrollbar">

        {/* KPI cards */}
        <OverviewKpis
          payments={fakeKpis.payments}
          paymentsChange={fakeKpis.paymentsChange}
          conversionRate={fakeKpis.conversionRate}
          avgPayment={fakeKpis.avgPayment}
          avgChange={fakeKpis.avgChange}
          activeLinks={fakeKpis.activeLinks}
        />

        {/* Summary + Chart */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-8">
          <div className="sm:col-span-3">
            <RevenueSummary today={fakeRevenue.today} week={fakeRevenue.week} month={fakeRevenue.month} total={fakeRevenue.total} />
          </div>
          <div className="sm:col-span-5">
            <OverviewCharts volumeByDay={fakeVolumeByDay} />
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-xl border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-medium text-foreground">Recent Transactions</h2>
            <Link href="/dashboard/payments" className="flex items-center gap-1 text-[11px] text-muted hover:text-foreground transition-colors">
              See All <ArrowRight size={11} />
            </Link>
          </div>
          <div className="hidden sm:flex items-center gap-4 border-b border-border/50 px-5 py-2 text-[10px] font-medium uppercase tracking-wider text-muted">
            <span className="w-9" />
            <span className="flex-1">Amount</span>
            <span className="w-24">Track ID</span>
            <span className="w-16 text-right">Crypto</span>
            <span className="w-16 text-right">Time</span>
          </div>
          <div className="divide-y divide-border/50">
            {fakeRecentTxs.map((tx) => (
              <div key={tx.id} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-surface/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface">
                  <span className={`h-2 w-2 rounded-full ${statusDot[tx.status as PaymentStatus] ?? "bg-muted"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground tabular-nums">
                      ${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                      tx.status === "paid" ? "bg-success-muted text-success"
                      : tx.status === "pending" ? "bg-warning-muted text-warning"
                      : tx.status === "confirming" ? "bg-info-muted text-info"
                      : "bg-surface text-muted"
                    }`}>
                      {statusLabel[tx.status as PaymentStatus] ?? tx.status}
                    </span>
                  </div>
                </div>
                <span className="hidden sm:block w-24 truncate font-mono text-[11px] text-muted">{tx.trackId}</span>
                <span className="w-16 text-right font-mono text-xs font-medium text-foreground-secondary uppercase">{tx.payCurrency}</span>
                <span className="w-16 text-right text-[11px] text-muted tabular-nums">{relativeTime(tx.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN : 3 cols — independently scrollable ── */}
      <DashboardRightColumn
        totalUsd={fakeWallet.totalUsd}
        change24h={2_342.00}
        holdings={fakeWallet.holdings}
      />

    </div>
  );
}
