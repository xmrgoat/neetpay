"use client";

import { Shield, Zap, Code2 } from "lucide-react";
import { useStaggerChildren } from "@/hooks/use-stagger-children";

const FEATURES = [
  {
    icon: Shield,
    title: "Private by default",
    description:
      "No KYC required. No transaction tracking. Your customers' data stays their own. Built with Monero-grade privacy principles.",
  },
  {
    icon: Zap,
    title: "Confirmations in minutes",
    description:
      "Fast settlement across 18+ cryptocurrencies and multiple networks. No waiting days for bank transfers.",
  },
  {
    icon: Code2,
    title: "Three lines of code",
    description:
      "RESTful API designed for developers. Invoice generation, webhook callbacks, and status polling. Ship payments in an afternoon.",
  },
];

export function FeaturesSection() {
  const gridRef = useStaggerChildren<HTMLDivElement>("[data-feature]");

  return (
    <section id="products" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Payments without the paperwork
          </h2>
          <p className="mt-4 text-lg text-foreground-secondary leading-relaxed">
            Accept crypto from anyone, anywhere. No intermediaries, no frozen funds, no permission required.
          </p>
        </div>

        <div
          ref={gridRef}
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              data-feature
              className="rounded-xl border border-border bg-surface p-8 transition-colors hover:border-border-strong"
            >
              <feature.icon
                size={24}
                className="text-foreground-secondary mb-5"
                strokeWidth={1.5}
              />
              <h3 className="font-heading text-lg font-semibold mb-3">
                {feature.title}
              </h3>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
