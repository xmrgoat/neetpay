"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  DollarSign,
  TrendingUp,
  ArrowLeftRight,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OverviewCardsProps {
  stats: {
    totalRevenue: number;
    monthRevenue: number;
    paymentCount: number;
    paymentChange: number;
    conversionRate: number;
    revenueChange: number;
  };
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const cards = [
  {
    key: "totalRevenue",
    label: "Revenue",
    icon: DollarSign,
    format: (v: number) => formatCurrency(v),
    changeKey: "revenueChange" as const,
    color: "text-primary",
    bg: "bg-primary-muted",
  },
  {
    key: "monthRevenue",
    label: "Monthly Revenue",
    icon: TrendingUp,
    format: (v: number) => formatCurrency(v),
    changeKey: "revenueChange" as const,
    color: "text-success",
    bg: "bg-success-muted",
  },
  {
    key: "paymentCount",
    label: "Payments",
    icon: ArrowLeftRight,
    format: (v: number) => v.toLocaleString("en-US").padStart(2, "0"),
    changeKey: "paymentChange" as const,
    color: "text-info",
    bg: "bg-info-muted",
  },
  {
    key: "conversionRate",
    label: "Conversion Rate",
    icon: Percent,
    format: (v: number) => `${v.toFixed(1)}%`,
    changeKey: null,
    color: "text-warning",
    bg: "bg-warning-muted",
  },
] as const;

export function OverviewCards({ stats }: OverviewCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      gsap.fromTo(
        containerRef.current.children,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power2.out" }
      );
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {cards.map((card) => {
        const value = stats[card.key as keyof typeof stats];
        const change = card.changeKey ? stats[card.changeKey] : null;

        return (
          <div
            key={card.key}
            className="group relative overflow-hidden rounded-xl border border-border bg-background p-5 transition-colors hover:border-border-hover"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted uppercase tracking-wider">
                {card.label}
              </p>
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", card.bg)}>
                <card.icon className={cn("h-4 w-4", card.color)} />
              </div>
            </div>

            <p className="mt-3 font-heading text-2xl font-bold tabular-nums text-foreground">
              {card.format(value)}
            </p>

            {change !== null && (
              <p
                className={cn(
                  "mt-2 flex items-center gap-1 text-xs font-medium",
                  change > 0 ? "text-success" : change < 0 ? "text-error" : "text-muted"
                )}
              >
                {change > 0 ? (
                  <ArrowUpRight size={14} strokeWidth={2.5} />
                ) : change < 0 ? (
                  <ArrowDownRight size={14} strokeWidth={2.5} />
                ) : null}
                {change > 0 ? "+" : ""}
                {change}%
                <span className="font-normal text-muted">vs last month</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
