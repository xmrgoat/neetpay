"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Percent,
  DollarSign,
  Link as LinkIcon,
  Clock,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CryptoIcon } from "@/components/icons/crypto-icons";
import { CRYPTO_COLORS } from "@/lib/constants";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PaymentMethodBreakdown {
  currency: string;
  percentage: number;
}

interface Props {
  today: number;
  week: number;
  month: number;
  total: number;
  payments: number;
  paymentsChange: number;
  conversionRate: number;
  avgPayment: number;
  avgChange: number;
  activeLinks: number;
  pendingPayout: number;
  pendingCount: number;
  successRate: number;
  paymentMethods: PaymentMethodBreakdown[];
  sparklines: {
    paymentCounts: number[];
    conversionRates: number[];
    avgPayments: number[];
    activeLinkCounts: number[];
  };
}

// ─── Sparkline ──────────────────────────────────────────────────────────────

function Sparkline({ data, color = "var(--primary)" }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 48;
  const h = 20;

  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: 1 + (1 - (v - min) / range) * (h - 2),
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="1.5" fill={color} opacity="0.7" />
    </svg>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtFull(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function OverviewHero({
  today,
  week,
  month,
  total,
  payments,
  paymentsChange,
  conversionRate,
  avgPayment,
  avgChange,
  activeLinks,
  pendingPayout,
  pendingCount,
  successRate,
  paymentMethods,
  sparklines,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const els = ref.current.querySelectorAll("[data-anim]");
      const tl = gsap.timeline({
        onComplete() {
          gsap.set(els, { clearProps: "transform,opacity" });
        },
      });
      tl.fromTo(
        els,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "power3.out" },
      );
    },
    { scope: ref },
  );

  const kpis = [
    {
      label: "Payments",
      value: payments.toLocaleString(),
      change: paymentsChange,
      icon: ArrowLeftRight,
      spark: sparklines.paymentCounts,
    },
    {
      label: "Success",
      value: `${conversionRate}%`,
      change: null as number | null,
      icon: Percent,
      spark: sparklines.conversionRates,
    },
    {
      label: "Avg. Tx",
      value: `$${avgPayment}`,
      change: avgChange,
      icon: DollarSign,
      spark: sparklines.avgPayments,
    },
    {
      label: "Links",
      value: activeLinks.toString(),
      change: null as number | null,
      icon: LinkIcon,
      spark: sparklines.activeLinkCounts,
    },
  ];

  return (
    <div ref={ref} className="space-y-4">
      {/* ── Row 1: Revenue hero + KPI strip ── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Revenue — dominant left block */}
        <div
          data-anim
          className="lg:col-span-5 rounded-2xl border border-border bg-background p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted">
                Revenue Today
              </span>
            </div>
            <p className="font-heading text-[42px] font-bold tabular-nums text-foreground leading-none tracking-tight">
              {fmtFull(today)}
            </p>
          </div>

          {/* Period breakdown — horizontal, not cards */}
          <div className="mt-5 flex items-baseline gap-6 border-t border-border/40 pt-4">
            {[
              { label: "Week", value: week },
              { label: "Month", value: month },
              { label: "All time", value: total },
            ].map((p) => (
              <div key={p.label}>
                <p className="font-heading text-lg font-semibold tabular-nums text-foreground leading-none">
                  {fmt(p.value)}
                </p>
                <p className="mt-1 text-[10px] text-muted">{p.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* KPI cells — right side, 2×2 grid */}
        <div data-anim className="lg:col-span-4 grid grid-cols-2 gap-3">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="group rounded-2xl border border-border bg-background p-4 flex flex-col justify-between transition-colors duration-200 hover:border-border-hover"
            >
              <div className="flex items-center justify-between">
                <k.icon className="h-3.5 w-3.5 text-muted" />
                <Sparkline data={k.spark} />
              </div>
              <div className="mt-3">
                <p className="font-heading text-xl font-bold tabular-nums text-foreground leading-none">
                  {k.value}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[10px] text-muted">{k.label}</span>
                  {k.change !== null && (
                    <span
                      className={cn(
                        "flex items-center gap-0.5 text-[10px] font-semibold tabular-nums",
                        k.change > 0 ? "text-success" : k.change < 0 ? "text-error" : "text-muted",
                      )}
                    >
                      {k.change > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                      {k.change > 0 ? "+" : ""}{k.change}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Status strip — rightmost column */}
        <div data-anim className="lg:col-span-3 flex flex-col gap-3">
          {/* Pending payout */}
          <div className="flex-1 rounded-2xl border border-border bg-background p-4 flex flex-col justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-warning" />
              <span className="text-[10px] font-medium text-muted uppercase tracking-wider">
                Pending
              </span>
              {pendingCount > 0 && (
                <span className="ml-auto rounded-full bg-warning/15 px-1.5 py-0.5 text-[9px] font-bold text-warning tabular-nums">
                  {pendingCount}
                </span>
              )}
            </div>
            <p className="mt-2 font-heading text-lg font-bold tabular-nums text-foreground leading-none">
              {fmtFull(pendingPayout)}
            </p>
          </div>

          {/* Top methods — compact */}
          <div className="flex-1 rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Activity className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-medium text-muted uppercase tracking-wider">
                Top Methods
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {paymentMethods.slice(0, 4).map((m) => {
                const color = CRYPTO_COLORS[m.currency] ?? "#737373";
                return (
                  <div key={m.currency} className="flex items-center gap-2">
                    <div
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: color }}
                    >
                      <CryptoIcon symbol={m.currency} size={12} />
                    </div>
                    {/* Bar visualization */}
                    <div className="flex-1 h-1 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(m.percentage, 2)}%`, backgroundColor: color }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-muted tabular-nums w-8 text-right">
                      {m.percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
