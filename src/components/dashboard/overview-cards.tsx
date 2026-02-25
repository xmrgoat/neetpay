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
    iconBg: "bg-primary-muted",
    iconColor: "text-primary",
  },
  {
    key: "monthRevenue",
    label: "Monthly Revenue",
    icon: TrendingUp,
    format: (v: number) => formatCurrency(v),
    changeKey: "revenueChange" as const,
    iconBg: "bg-success-muted",
    iconColor: "text-success",
  },
  {
    key: "paymentCount",
    label: "Payments",
    icon: ArrowLeftRight,
    format: (v: number) => v.toLocaleString("en-US").padStart(2, "0"),
    changeKey: "paymentChange" as const,
    iconBg: "bg-info-muted",
    iconColor: "text-info",
  },
  {
    key: "conversionRate",
    label: "Conversion Rate",
    icon: Percent,
    format: (v: number) => `${v.toFixed(1)}%`,
    changeKey: null,
    iconBg: "bg-warning-muted",
    iconColor: "text-warning",
  },
] as const;

export function OverviewCards({ stats }: OverviewCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(containerRef.current?.children ?? [], {
        opacity: 0,
        y: 16,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.out",
      });
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
            className="flex items-start gap-4 rounded-xl border border-border bg-background p-5"
          >
            {/* Icon */}
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", card.iconBg)}>
              <card.icon className={cn("h-[18px] w-[18px]", card.iconColor)} />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted">
                {card.label}
              </p>
              <p className="mt-1 font-heading text-xl font-semibold tabular-nums text-foreground">
                {card.format(value)}
              </p>
              {change !== null && change !== 0 && (
                <p
                  className={cn(
                    "mt-1 flex items-center gap-1 text-[11px] font-medium",
                    change > 0 ? "text-success" : "text-error"
                  )}
                >
                  {change > 0 ? (
                    <ArrowUpRight size={12} strokeWidth={2.5} />
                  ) : (
                    <ArrowDownRight size={12} strokeWidth={2.5} />
                  )}
                  {change > 0 ? "+" : ""}
                  {change}%
                  <span className="font-normal text-muted">vs last month</span>
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
