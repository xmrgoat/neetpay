"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WalletBalance } from "@/types/wallet";

interface BalanceCardProps {
  balance: WalletBalance;
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `$${value.toFixed(2)}`;
}

export function BalanceCard({ balance }: BalanceCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isPositive = balance.change24hPercent >= 0;

  useGSAP(
    () => {
      if (!cardRef.current) return;
      gsap.from(cardRef.current, {
        opacity: 0,
        y: 16,
        duration: 0.5,
        ease: "power2.out",
      });
    },
    { scope: cardRef },
  );

  return (
    <div
      ref={cardRef}
      className="rounded-xl border border-border bg-background p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-muted">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs font-medium text-muted">Total Balance</p>
          </div>

          <p className="mt-3 font-heading text-3xl font-semibold tabular-nums text-foreground tracking-tight">
            {formatUsd(balance.totalUsd)}
          </p>

          {balance.change24hPercent !== 0 && (
            <div className="mt-2 flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium",
                  isPositive ? "text-success" : "text-error",
                )}
              >
                {isPositive ? (
                  <ArrowUpRight size={14} strokeWidth={2.5} />
                ) : (
                  <ArrowDownRight size={14} strokeWidth={2.5} />
                )}
                {isPositive ? "+" : ""}
                {balance.change24hPercent.toFixed(2)}%
              </span>
              <span className="text-xs text-muted">
                {isPositive ? "+" : ""}
                {formatUsd(balance.change24hUsd)} today
              </span>
            </div>
          )}
        </div>

        <div className="text-right">
          <p className="text-[11px] text-muted">
            {balance.assets.filter((a) => a.balance > 0).length} assets
          </p>
        </div>
      </div>
    </div>
  );
}
