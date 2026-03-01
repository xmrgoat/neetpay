"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Paintbrush, Link2, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

/* ─── White-label checkout mockup ─────────────────────── */

function CheckoutMockup() {
  return (
    <div className="rounded-xl border border-[#1e1e24] bg-[#0a0a0e] overflow-hidden w-full max-w-[320px]">
      {/* Browser bar */}
      <div className="flex items-center gap-2 border-b border-[#1e1e24] px-3 py-2">
        <div className="flex gap-1">
          <div className="h-2 w-2 rounded-full bg-[#333]" />
          <div className="h-2 w-2 rounded-full bg-[#333]" />
          <div className="h-2 w-2 rounded-full bg-[#333]" />
        </div>
        <div className="flex-1 flex justify-center">
          <span className="text-[9px] text-[#444] font-mono">pay.yourstore.com/checkout</span>
        </div>
      </div>

      {/* Checkout content */}
      <div className="p-5 space-y-4">
        {/* Merchant branding */}
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">YS</span>
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#ccc]">Your Store</p>
            <p className="text-[9px] text-[#555]">Order #4812</p>
          </div>
        </div>

        {/* Amount */}
        <div className="rounded-lg bg-[#111116] border border-[#1e1e24] p-3 text-center">
          <p className="text-[10px] text-[#555] mb-1">Amount due</p>
          <p className="text-xl font-heading font-bold text-[#eee]">$29.99</p>
        </div>

        {/* Crypto selector */}
        <div className="space-y-1.5">
          <p className="text-[9px] text-[#555] uppercase tracking-wider">Pay with</p>
          {[
            { name: "ETH", sub: "Ethereum", color: "#627EEA", selected: true },
            { name: "XMR", sub: "Monero", color: "#FF6600" },
            { name: "BTC", sub: "Bitcoin", color: "#F7931A" },
          ].map((c) => (
            <div
              key={c.name}
              className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                c.selected
                  ? "border border-[#ff6600]/40 bg-[#ff6600]/5"
                  : "border border-[#1e1e24] bg-[#0e0e12]"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-[11px] font-medium text-[#ccc]">{c.name}</span>
                <span className="text-[9px] text-[#444]">{c.sub}</span>
              </div>
              {c.selected && (
                <div className="h-3 w-3 rounded-full bg-[#ff6600] flex items-center justify-center">
                  <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
                    <path d="M1 3L2.5 4.5L5 1.5" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pay button */}
        <div className="rounded-lg bg-[#ff6600] py-2.5 text-center">
          <span className="text-[11px] font-semibold text-white">Pay 0.0089 ETH</span>
        </div>

        <p className="text-[8px] text-[#333] text-center">Powered by neetpay</p>
      </div>
    </div>
  );
}

/* ─── Payment link mockup ─────────────────────────────── */

function PaymentLinkMockup() {
  return (
    <div className="space-y-3 w-full max-w-[340px]">
      {/* Link creation */}
      <div className="rounded-xl border border-[#1e1e24] bg-[#0a0a0e] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#1e1e24] px-3 py-2">
          <Link2 size={10} className="text-[#555]" />
          <span className="text-[10px] text-[#555]">Payment Links</span>
        </div>
        <div className="p-4 space-y-3">
          {/* Link row */}
          {[
            { label: "Pro Plan — Monthly", amount: "$29.00", status: "active", clicks: "142" },
            { label: "Design Workshop", amount: "$199.00", status: "active", clicks: "38" },
            { label: "Consultation 1h", amount: "$75.00", status: "active", clicks: "91" },
          ].map((link, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-[#1e1e24] bg-[#0e0e12] px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-[#ccc] truncate">{link.label}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-mono text-[#ff6600]/70">{link.amount}</span>
                  <span className="text-[8px] text-[#444]">{link.clicks} clicks</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="inline-flex h-4 items-center rounded bg-emerald-500/15 px-1.5 text-[8px] font-medium text-emerald-400">
                  {link.status}
                </span>
                <ExternalLink size={10} className="text-[#444]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shareable link preview */}
      <div className="rounded-lg border border-dashed border-[#1e1e24] bg-[#08080c] px-3 py-2.5 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] text-[#555] truncate">
            pay.neetpay.com/l/<span className="text-[#ff6600]/60">pro-plan-monthly</span>
          </p>
        </div>
        <button className="text-[9px] text-[#666] border border-[#1e1e24] rounded px-2 py-1 hover:text-[#999] transition-colors shrink-0">
          Copy
        </button>
      </div>
    </div>
  );
}

/* ─── Features section ────────────────────────────────── */

export function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current) return;

      const headTl = gsap.timeline({
        scrollTrigger: {
          trigger: "[data-features-heading]",
          start: "top 90%",
          end: "top -10%",
          scrub: 2,
        },
      });
      headTl.fromTo("[data-features-heading]",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.4 }
      );
      headTl.to("[data-features-heading]",
        { opacity: 0, duration: 0.4 }, 0.6
      );

      const cards = sectionRef.current.querySelectorAll("[data-feature-card]");
      cards.forEach((card) => {
        const cardTl = gsap.timeline({
          scrollTrigger: {
            trigger: card,
            start: "top 90%",
            end: "top -10%",
            scrub: 2,
          },
        });
        cardTl.fromTo(card,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.4 }
        );
        cardTl.to(card,
          { opacity: 0, duration: 0.4 }, 0.6
        );
      });
    },
    { scope: sectionRef, revertOnUpdate: true }
  );

  return (
    <section id="products" ref={sectionRef} className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Heading */}
        <div data-features-heading className="mb-16">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Two ways to get paid.
          </h2>
          <p className="mt-4 max-w-lg text-lg text-foreground-secondary leading-relaxed">
            Embed a checkout or share a link. Either way, your customer pays in crypto and you keep everything.
          </p>
        </div>

        {/* Two feature cards */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Card 1 — White-label checkout */}
          <div
            data-feature-card
            className="rounded-2xl border border-border bg-surface p-6 sm:p-8 transition-colors hover:border-border-hover"
          >
            <div className="flex items-center gap-2 mb-6">
              <Paintbrush size={16} className="text-muted" strokeWidth={1.5} />
              <span className="text-[11px] font-medium text-muted uppercase tracking-wider">White-label</span>
            </div>

            <h3 className="font-heading text-2xl font-semibold mb-3 sm:text-3xl">
              Your brand.{" "}
              <span className="text-muted">Your checkout.</span>
            </h3>
            <p className="text-foreground-secondary leading-relaxed max-w-md mb-8">
              Custom domain, your logo, your colors. Customers see your brand — not ours. Embed it in your site or redirect to a hosted page.
            </p>

            <div className="flex justify-center">
              <CheckoutMockup />
            </div>
          </div>

          {/* Card 2 — Payment links */}
          <div
            data-feature-card
            className="rounded-2xl border border-border bg-surface p-6 sm:p-8 transition-colors hover:border-border-hover"
          >
            <div className="flex items-center gap-2 mb-6">
              <Link2 size={16} className="text-muted" strokeWidth={1.5} />
              <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Payment Links</span>
            </div>

            <h3 className="font-heading text-2xl font-semibold mb-3 sm:text-3xl">
              Share a link.{" "}
              <span className="text-muted">Get paid.</span>
            </h3>
            <p className="text-foreground-secondary leading-relaxed max-w-md mb-8">
              No website needed. Create a payment link from the dashboard, share it anywhere — social, email, DMs. Track every click and conversion.
            </p>

            <div className="flex justify-center">
              <PaymentLinkMockup />
            </div>
          </div>
        </div>

        {/* Subtle stats row */}
        <div
          data-feature-card
          className="mt-4 rounded-2xl border border-border bg-surface px-6 py-5 sm:px-8"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-8 sm:gap-12">
              <div className="text-center sm:text-left">
                <p className="font-heading text-2xl font-bold">0%</p>
                <p className="text-[10px] text-muted uppercase tracking-wider mt-0.5">Transaction fees</p>
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <div className="text-center sm:text-left">
                <p className="font-heading text-2xl font-bold">18+</p>
                <p className="text-[10px] text-muted uppercase tracking-wider mt-0.5">Cryptocurrencies</p>
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <div className="text-center sm:text-left">
                <p className="font-heading text-2xl font-bold">5</p>
                <p className="text-[10px] text-muted uppercase tracking-wider mt-0.5">Chains</p>
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <div className="text-center sm:text-left">
                <p className="font-heading text-2xl font-bold">0</p>
                <p className="text-[10px] text-muted uppercase tracking-wider mt-0.5">KYC required</p>
              </div>
            </div>
            <Link
              href="/register"
              className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors shrink-0"
            >
              Start for free
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
