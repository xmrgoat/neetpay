"use client";

import { useCountUp } from "@/hooks/use-count-up";

function StatItem({
  target,
  suffix,
  prefix,
  label,
  decimals,
}: {
  target: number;
  suffix: string;
  prefix?: string;
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
        {prefix}{display}
      </p>
      <p className="mt-3 text-[11px] text-muted uppercase tracking-[0.15em]">
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
          <StatItem target={0} suffix="%" label="Transaction fees. Ever." />
          <StatItem target={5} suffix="" label="Chains — EVM, Solana, BTC, TRON, XMR" />
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
