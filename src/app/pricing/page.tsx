"use client";

import { useState } from "react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PricingCard } from "@/components/landing/pricing-card";
import { PRICING_PLANS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Minus } from "lucide-react";

const COMPARISON_FEATURES = [
  { feature: "Monthly transactions", free: "100", pro: "10,000", enterprise: "Unlimited" },
  { feature: "API rate limit", free: "60/min", pro: "600/min", enterprise: "Custom" },
  { feature: "Supported currencies", free: "5", pro: "18+", enterprise: "18+" },
  { feature: "Webhook retries", free: "3", pro: "10", enterprise: "Custom" },
  { feature: "Support", free: "Community", pro: "Email", enterprise: "Dedicated" },
  { feature: "Custom branding", free: "No", pro: "Yes", enterprise: "Yes" },
  { feature: "Analytics", free: "Basic", pro: "Advanced", enterprise: "Advanced" },
  { feature: "Team members", free: "1", pro: "5", enterprise: "Unlimited" },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <Navbar />
      <main className="pt-24">
        {/* Hero */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-lg text-foreground-secondary">
              Start free. Scale when you need to. No hidden fees.
            </p>
          </div>
        </section>

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
        <div className="mx-auto max-w-5xl px-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 mb-24">
          <PricingCard {...PRICING_PLANS.free} annual={annual} />
          <PricingCard {...PRICING_PLANS.pro} annual={annual} recommended />
          <PricingCard {...PRICING_PLANS.enterprise} annual={annual} />
        </div>

        {/* Comparison table */}
        <section className="border-t border-border py-24">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-center mb-12">
              Compare plans
            </h2>

            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-widest text-foreground-secondary">
                      Feature
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-widest text-foreground-secondary">
                      Free
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-widest text-primary">
                      Pro
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-widest text-foreground-secondary">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_FEATURES.map((row) => (
                    <tr
                      key={row.feature}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-6 py-4 text-sm text-foreground">
                        {row.feature}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-foreground-secondary">
                        {row.free}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-foreground">
                        {row.pro}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-foreground-secondary">
                        {row.enterprise}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
