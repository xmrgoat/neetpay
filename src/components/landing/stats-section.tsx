"use client";

import { useCountUp } from "@/hooks/use-count-up";

function StatItem({
  target,
  suffix,
  label,
  decimals,
}: {
  target: number;
  suffix: string;
  label: string;
  decimals?: number;
}) {
  const { ref, display } = useCountUp<HTMLParagraphElement>(target, { suffix, decimals });

  return (
    <div className="text-center">
      <p
        ref={ref}
        className="font-heading text-5xl font-bold tracking-tight sm:text-6xl"
      >
        {display}
      </p>
      <p className="mt-3 text-sm text-foreground-secondary uppercase tracking-widest">
        {label}
      </p>
    </div>
  );
}

export function StatsSection() {
  return (
    <section className="py-24 sm:py-32 bg-surface border-y border-border">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 sm:grid-cols-3">
          <StatItem target={10000} suffix="+" label="Transactions processed" />
          <StatItem target={18} suffix="+" label="Cryptocurrencies" />
          <StatItem
            target={99.9}
            suffix="%"
            label="Uptime"
            decimals={1}
          />
        </div>
      </div>
    </section>
  );
}
