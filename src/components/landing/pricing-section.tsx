"use client";

import { useState } from "react";
import { PRICING_PLANS } from "@/lib/constants";
import { PricingCard } from "./pricing-card";
import { useStaggerChildren } from "@/hooks/use-stagger-children";
import { cn } from "@/lib/utils";

export function PricingSection() {
  const [annual, setAnnual] = useState(false);
  const gridRef = useStaggerChildren<HTMLDivElement>("[data-pricing-card]");

  return (
    <section className="py-24 sm:py-32 border-t border-border">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-foreground-secondary">
            Start free. Scale when you need to. No hidden fees.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <button
            onClick={() => setAnnual(false)}
            className={cn(
              "text-sm font-medium transition-colors",
              !annual ? "text-foreground" : "text-foreground-secondary"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(!annual)}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              annual ? "bg-primary" : "bg-border-strong"
            )}
            aria-label="Toggle annual billing"
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                annual && "translate-x-5"
              )}
            />
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={cn(
              "text-sm font-medium transition-colors",
              annual ? "text-foreground" : "text-foreground-secondary"
            )}
          >
            Annual
            <span className="ml-1.5 text-xs text-primary">Save 17%</span>
          </button>
        </div>

        {/* Cards */}
        <div
          ref={gridRef}
          className="grid gap-8 max-w-5xl mx-auto sm:grid-cols-2 lg:grid-cols-3"
        >
          <div data-pricing-card>
            <PricingCard {...PRICING_PLANS.free} annual={annual} />
          </div>
          <div data-pricing-card>
            <PricingCard {...PRICING_PLANS.pro} annual={annual} recommended />
          </div>
          <div data-pricing-card>
            <PricingCard {...PRICING_PLANS.enterprise} annual={annual} />
          </div>
        </div>
      </div>
    </section>
  );
}
