"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

interface RevenueSummaryProps {
  today: number;
  week: number;
  month: number;
  total: number;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

const rows = [
  { key: "today", label: "Revenue today" },
  { key: "week", label: "Revenue this week" },
  { key: "month", label: "Revenue this month" },
  { key: "total", label: "Total revenue" },
] as const;

export function RevenueSummary({ today, week, month, total }: RevenueSummaryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      const items = containerRef.current.querySelectorAll("[data-row]");
      gsap.fromTo(
        items,
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.4, stagger: 0.08, ease: "power2.out" }
      );
    },
    { scope: containerRef }
  );

  const values = { today, week, month, total };

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col rounded-xl border border-border bg-background p-5"
    >
      <div className="mb-4">
        <h2 className="font-heading text-base font-semibold text-foreground">Summary</h2>
        <p className="text-xs text-muted">Your revenue overview</p>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-1">
        {rows.map((row) => (
          <div
            key={row.key}
            data-row
            className="relative rounded-lg border-l-2 border-primary/40 py-3 pl-4 transition-colors hover:bg-surface/50"
          >
            <p className="font-heading text-xl font-bold tabular-nums text-foreground">
              {formatCurrency(values[row.key])}
            </p>
            <p className="text-[11px] text-muted">{row.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
