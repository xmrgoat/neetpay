"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { DollarSign, Clock, CheckCircle2, TrendingUp } from "lucide-react";
import { CRYPTO_COLORS } from "@/lib/constants";
import { CryptoIcon } from "@/components/icons/crypto-icons";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PaymentMethodBreakdown {
  currency: string;
  percentage: number;
}

interface RevenueSummaryProps {
  today: number;
  week: number;
  month: number;
  total: number;
  successRate: number;
  pendingPayout: number;
  pendingCount: number;
  paymentMethods: PaymentMethodBreakdown[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const CRYPTO_ICONS: Record<string, string> = {
  BTC: "₿", ETH: "Ξ", SOL: "◎", XMR: "ɱ",
  USDT: "₮", USDC: "$", TRX: "◈", BNB: "◆",
  LTC: "Ł", DOGE: "Ð", TON: "◇", XRP: "✕",
  AVAX: "▲", ARB: "◬", OP: "⬡", MATIC: "◈",
};

function fmt(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtFull(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Mini donut ─────────────────────────────────────────────────────────────

function MiniDonut({ percentage, size = 32 }: { percentage: number; size?: number }) {
  const r = size * 0.4;
  const c = Math.PI * 2 * r;
  const fill = (percentage / 100) * c;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="currentColor" strokeWidth="3"
        className="text-border/40"
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--success)" strokeWidth="3"
        strokeDasharray={`${fill} ${c - fill}`}
        strokeDashoffset={c / 4}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RevenueSummary({
  today,
  week,
  month,
  total,
  successRate,
  pendingPayout,
  pendingCount,
  paymentMethods,
}: RevenueSummaryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      const cards = containerRef.current.querySelectorAll("[data-card]");
      const tl = gsap.timeline({
        onComplete() {
          gsap.set([containerRef.current!, ...cards], { clearProps: "transform,opacity" });
        },
      });
      tl.fromTo(
        cards,
        { opacity: 0, y: 8, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, stagger: 0.04, ease: "power2.out" }
      );
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col rounded-xl border border-border bg-background p-4"
    >
      {/* ── Revenue Today ── */}
      <div
        data-card
        className="rounded-xl p-3.5 mb-2"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)" }}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <DollarSign className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-medium text-muted uppercase tracking-wider">Revenue Today</span>
        </div>
        <p className="font-heading text-2xl font-bold tabular-nums text-foreground leading-none">
          {fmt(today)}
        </p>
      </div>

      {/* ── Revenue grid ── */}
      <div data-card className="grid grid-cols-3 gap-1.5 mb-2">
        {[
          { label: "Week", value: week },
          { label: "Month", value: month },
          { label: "Total", value: total },
        ].map((row) => (
          <div
            key={row.label}
            className="rounded-lg bg-surface/50 px-2.5 py-2 text-center"
          >
            <p className="font-heading text-xs font-bold tabular-nums text-foreground leading-none">
              {fmt(row.value)}
            </p>
            <p className="mt-1 text-[9px] text-muted">{row.label}</p>
          </div>
        ))}
      </div>

      {/* ── Pending Payout ── */}
      <div
        data-card
        className="rounded-xl p-3.5 mb-2"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.005) 100%)" }}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <Clock className="h-3 w-3 text-warning" />
          <span className="text-[10px] font-medium text-muted uppercase tracking-wider">
            {pendingCount} Pending Payout{pendingCount !== 1 ? "s" : ""}
          </span>
        </div>
        <p className="font-heading text-lg font-bold tabular-nums text-foreground leading-none">
          {fmtFull(pendingPayout)}
        </p>
      </div>

      {/* ── Success rate + Methods ── */}
      <div data-card className="grid grid-cols-2 gap-1.5 mt-auto">
        {/* Success */}
        <div className="rounded-xl bg-surface/40 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="h-3 w-3 text-success" />
            <span className="text-[9px] font-medium text-muted uppercase tracking-wider">Success</span>
          </div>
          <div className="flex items-center gap-2">
            <MiniDonut percentage={successRate} size={28} />
            <p className="font-heading text-base font-bold tabular-nums text-foreground leading-none">
              {successRate}%
            </p>
          </div>
        </div>

        {/* Methods */}
        <div className="rounded-xl bg-surface/40 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="h-3 w-3 text-primary" />
            <span className="text-[9px] font-medium text-muted uppercase tracking-wider">Methods</span>
          </div>
          <div className="flex flex-col gap-1">
            {paymentMethods.map((m) => {
              const color = CRYPTO_COLORS[m.currency] ?? "#737373";
              return (
                <div key={m.currency} className="flex items-center gap-1.5">
                  <div
                    className="flex h-3.5 w-3.5 items-center justify-center rounded-full"
                    style={{ backgroundColor: color }}
                  >
                    <CryptoIcon symbol={m.currency} size={14} />
                  </div>
                  <span className="text-[10px] font-medium text-foreground-secondary">{m.currency}</span>
                  <span className="text-[10px] text-muted tabular-nums ml-auto">{m.percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
