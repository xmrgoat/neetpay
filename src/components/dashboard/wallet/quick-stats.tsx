"use client";

import { useRef, useMemo } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Coins, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Holding {
  currency: string;
  amount: number;
  usdValue: number;
}

interface QuickStatsProps {
  holdings: Holding[];
  totalUsd: number;
  change24hUsd: number;
}

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) {
    return `$${abs.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `$${abs.toFixed(2)}`;
}

export function QuickStats({ holdings, totalUsd, change24hUsd }: QuickStatsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { activeCount, topHolding, topPct } = useMemo(() => {
    const active = holdings.filter((h) => h.amount > 0);
    const sorted = [...active].sort((a, b) => b.usdValue - a.usdValue);
    const top = sorted[0];
    const pct = top && totalUsd > 0 ? (top.usdValue / totalUsd) * 100 : 0;

    return {
      activeCount: active.length,
      topHolding: top?.currency ?? "—",
      topPct: pct,
    };
  }, [holdings, totalUsd]);

  const isPositive = change24hUsd >= 0;

  useGSAP(
    () => {
      if (!containerRef.current) return;
      const cards = containerRef.current.querySelectorAll("[data-stat]");
      if (!cards.length) return;
      gsap.from(cards, {
        opacity: 0,
        y: 12,
        duration: 0.35,
        stagger: 0.08,
        ease: "power2.out",
        delay: 0.3,
      });
    },
    { scope: containerRef },
  );

  return (
    <div ref={containerRef} className="grid grid-cols-3 gap-2.5 mt-4">
      {/* Active Assets */}
      <div data-stat className="rounded-xl border border-border bg-background px-3.5 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-muted">
            <Coins className="h-3 w-3 text-primary" />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted">Assets</span>
        </div>
        <p className="font-heading text-xl font-semibold tabular-nums text-foreground">
          {activeCount}
        </p>
        <p className="text-[10px] text-muted mt-0.5">active</p>
      </div>

      {/* Top Holding */}
      <div data-stat className="rounded-xl border border-border bg-background px-3.5 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-info-muted">
            <TrendingUp className="h-3 w-3 text-info" />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted">Top</span>
        </div>
        <p className="font-heading text-xl font-semibold text-foreground">
          {topHolding}
        </p>
        <p className="text-[10px] text-muted tabular-nums mt-0.5">
          {topPct > 0 ? `${topPct.toFixed(1)}%` : "—"}
        </p>
      </div>

      {/* 24h P&L */}
      <div data-stat className="rounded-xl border border-border bg-background px-3.5 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md",
              isPositive ? "bg-success-muted" : "bg-error-muted",
            )}
          >
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3 text-success" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-error" />
            )}
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted">24h</span>
        </div>
        <p
          className={cn(
            "font-heading text-xl font-semibold tabular-nums",
            isPositive ? "text-success" : "text-error",
          )}
        >
          {isPositive ? "+" : "-"}{formatUsd(change24hUsd)}
        </p>
        <p className="text-[10px] text-muted mt-0.5">P&L</p>
      </div>
    </div>
  );
}
