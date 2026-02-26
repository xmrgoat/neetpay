import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RevenueSummary } from "@/components/dashboard/revenue-summary";
import { OverviewCharts } from "@/components/dashboard/overview-charts";
import { DashboardRightColumn } from "@/components/dashboard/dashboard-right-column";
import { OverviewKpis } from "@/components/dashboard/overview-kpis";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import type { Transaction } from "@/components/dashboard/recent-transactions";

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

const fakePaymentsSummary = {
  revenueToday: 3_420,
  pendingPayout: 1_200,
  pendingCount: 1,
  successRate: 66.1,
  totalProcessed: 1_200,
  paymentMethods: [
    { currency: "BTC", percentage: 24.6 },
    { currency: "ETH", percentage: 7.1 },
    { currency: "XMR", percentage: 7.3 },
  ],
};

const fakeRecentTxs: Transaction[] = [
  { id: "tx_1", amount: 1_250.00, cryptoAmount: 0.00045158, status: "paid", trackId: "138029241", payCurrency: "BTC", txHash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2", address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", createdAt: new Date(Date.now() - 12 * 60_000) },
  { id: "tx_2", amount: 89.99, cryptoAmount: 0.00591233, status: "confirming", trackId: "138029255", payCurrency: "ETH", txHash: "0xf4d08de062d6d1f0205786a9c5c849c080bbfb8e0b7ddc1fb10bd3485c2b6fe3", address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18", createdAt: new Date(Date.now() - 34 * 60_000) },
  { id: "tx_3", amount: 450.00, cryptoAmount: 2.75124, status: "paid", trackId: "138029198", payCurrency: "XMR", txHash: "e8c4f2a1b3d5e7f9a0c2d4e6f8a1b3c5d7e9f0a2c4d6e8f1a3b5c7d9e0f2a4b6", address: "47sghzufGhJJDQEbScMCwVBimTvCZRMgThK5WxZQk8HMdjT7daW8aP7VhMN9RPF5", createdAt: new Date(Date.now() - 2.5 * 3600_000) },
  { id: "tx_4", amount: 2_100.00, cryptoAmount: 12.054, status: "paid", trackId: "138028901", payCurrency: "SOL", txHash: "5UxKm8Yr9tEj2Qp4wR7vN1mC6bF3dG8hJ0kL2nA4pB6qD9sE1fH3iK5lM7nO9pQ", address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHkv", createdAt: new Date(Date.now() - 5 * 3600_000) },
  { id: "tx_5", amount: 34.50, cryptoAmount: 34.50, status: "pending", trackId: "138029267", payCurrency: "USDT", txHash: "", address: "TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7", createdAt: new Date(Date.now() - 8 * 3600_000) },
  { id: "tx_6", amount: 780.00, cryptoAmount: 0.00017216, status: "paid", trackId: "138028734", payCurrency: "BTC", txHash: "c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8", address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", createdAt: new Date(Date.now() - 12 * 3600_000) },
];

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
            <RevenueSummary
              today={fakeRevenue.today}
              week={fakeRevenue.week}
              month={fakeRevenue.month}
              total={fakeRevenue.total}
              successRate={fakePaymentsSummary.successRate}
              pendingPayout={fakePaymentsSummary.pendingPayout}
              pendingCount={fakePaymentsSummary.pendingCount}
              paymentMethods={fakePaymentsSummary.paymentMethods}
            />
          </div>
          <div className="sm:col-span-5">
            <OverviewCharts volumeByDay={fakeVolumeByDay} />
          </div>
        </div>

        {/* Recent Transactions */}
        <RecentTransactions transactions={fakeRecentTxs} />
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
