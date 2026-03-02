"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { PRICING_PLANS } from "@/lib/constants";
import { PricingCard } from "./pricing-card";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

/* ─── Flat-fee comparison strip ──────────────────────── */

function ComparisonStrip() {
  return (
    <div className="mx-auto max-w-2xl mb-14 glass rounded-2xl px-6 py-5">
      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted mb-4">
        The math is simple
      </p>
      <div className="space-y-3">
        {[
          { label: "neetpay", sublabel: "flat monthly fee", amount: "$29", note: "at any volume", pct: 97, primary: true },
          { label: "1% processor", sublabel: "at $3k/month", amount: "$30", note: "just for that month", pct: 100, primary: false },
        ].map((row) => (
          <div key={row.label}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{row.label}</span>
                <span className="text-[11px] text-muted">{row.sublabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("font-heading text-sm font-bold tabular-nums", row.primary ? "text-primary" : "text-foreground-secondary")}>
                  {row.amount}
                </span>
                <span className="text-[10px] text-muted hidden sm:inline">— {row.note}</span>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-elevated overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", row.primary ? "bg-primary" : "bg-border-hover")}
                style={{ width: `${row.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-muted">
        At $10k/month, 1% costs $100. neetpay is still $29.
      </p>
    </div>
  );
}

/* ─── Billing toggle ──────────────────────────────────── */

function BillingToggle({ annual, onChange }: { annual: boolean; onChange: (v: boolean) => void }) {
  return (
    <div role="group" aria-label="Billing period" className="inline-flex items-center rounded-full border border-border bg-surface p-1">
      <button
        onClick={() => onChange(false)}
        aria-pressed={!annual}
        className={cn(
          "rounded-full px-5 py-1.5 text-sm font-medium transition-colors",
          !annual ? "bg-primary text-white" : "text-foreground-secondary hover:text-foreground"
        )}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange(true)}
        aria-pressed={annual}
        className={cn(
          "flex items-center gap-2 rounded-full px-5 py-1.5 text-sm font-medium transition-colors",
          annual ? "bg-primary text-white" : "text-foreground-secondary hover:text-foreground"
        )}
      >
        Annual
        <span className={cn("text-[10px] font-semibold transition-colors", annual ? "text-white/70" : "text-primary")}>
          2 months free
        </span>
      </button>
    </div>
  );
}

/* ─── Section ─────────────────────────────────────────── */

export function PricingSection() {
  const [annual, setAnnual] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current) return;

      gsap.fromTo("[data-pricing-heading]", { opacity: 0, y: 32 }, {
        opacity: 1, y: 0, duration: 0.7, ease: "power3.out",
        scrollTrigger: { trigger: "[data-pricing-heading]", start: "top 88%", toggleActions: "play none none none" },
      });

      gsap.fromTo("[data-pricing-toggle]", { opacity: 0, scale: 0.94 }, {
        opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.5)",
        scrollTrigger: { trigger: "[data-pricing-toggle]", start: "top 88%", toggleActions: "play none none none" },
      });

      const cards = sectionRef.current.querySelectorAll("[data-pricing-card]");
      ScrollTrigger.create({
        trigger: cards[0],
        start: "top 88%",
        once: true,
        onEnter() {
          gsap.fromTo(cards[0], { opacity: 0, y: 44, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" });
          gsap.fromTo(cards[1], { opacity: 0, y: 60, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "back.out(1.2)", delay: 0.12 });
          gsap.fromTo(cards[2], { opacity: 0, y: 44, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out", delay: 0.22 });
        },
      });
    },
    { scope: sectionRef, revertOnUpdate: true }
  );

  return (
    <section ref={sectionRef} className="py-24 sm:py-32 border-t border-border">
      <div className="mx-auto max-w-7xl px-6">
        {/* Heading */}
        <div data-pricing-heading className="mb-10 text-center">
          <p className="text-[11px] font-medium uppercase tracking-widest text-primary mb-4">Pricing</p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Flat fee. Not a percentage.
          </h2>
          <p className="mt-4 text-lg text-foreground-secondary max-w-md mx-auto">
            Pay once. Accept unlimited transactions. Your revenue is yours.
          </p>
        </div>

        {/* Comparison strip */}
        <ComparisonStrip />

        {/* Toggle */}
        <div data-pricing-toggle className="flex justify-center mb-10">
          <BillingToggle annual={annual} onChange={setAnnual} />
        </div>

        {/* Cards — 3 column, Pro centered and elevated */}
        <div className="grid gap-4 max-w-5xl mx-auto sm:grid-cols-3 items-center">
          <div data-pricing-card>
            <PricingCard {...PRICING_PLANS.free} annual={annual} />
          </div>
          <div data-pricing-card className="sm:-my-4">
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
