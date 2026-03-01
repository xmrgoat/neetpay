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
        <div className="mb-12 text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Flat fee. Not a percentage.
          </h2>
          <p className="mt-4 text-lg text-foreground-secondary max-w-lg mx-auto">
            At $3,000/month in volume, you pay $29. A 1% processor charges $30 — just for that month.
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
              annual ? "bg-primary" : "bg-border"
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
            <span className="ml-1.5 text-xs text-primary">2 months free</span>
          </button>
        </div>

        {/* Cards */}
        <div
          ref={gridRef}
          className="grid gap-4 max-w-3xl mx-auto sm:grid-cols-2"
        >
          <div data-pricing-card>
            <PricingCard {...PRICING_PLANS.free} annual={annual} />
          </div>
          <div data-pricing-card>
            <PricingCard {...PRICING_PLANS.enterprise} annual={annual} />
          </div>
        </div>
      </div>
    </section>
  );
}
