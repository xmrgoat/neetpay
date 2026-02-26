"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Shield, Zap, Code2, Globe, Terminal } from "lucide-react";
import { CrystalScene } from "./crystal-scene";

gsap.registerPlugin(ScrollTrigger);

/* ─── Miniature UI mockups (always dark — product previews) ─ */

function ApiMockup() {
  return (
    <div className="rounded-lg border border-[#1e1e24] bg-[#0a0a0e] overflow-hidden text-[11px] font-mono">
      <div className="flex items-center gap-2 border-b border-[#1e1e24] px-3 py-2">
        <Terminal size={10} className="text-[#555]" />
        <span className="text-[10px] text-[#555]">checkout.ts</span>
      </div>
      <div className="p-3 space-y-0.5 text-[11px] leading-5">
        <div><span className="text-[#666]">const</span> <span className="text-[#ccc]">payment</span> <span className="text-[#666]">=</span> <span className="text-[#666]">await</span> <span className="text-[#999]">fetch</span><span className="text-[#666]">(</span></div>
        <div className="pl-3"><span className="text-[#ff6600]/70">&quot;/v1/payment&quot;</span><span className="text-[#666]">,</span> <span className="text-[#666]">{"{"}</span></div>
        <div className="pl-5"><span className="text-[#999]">amount</span><span className="text-[#666]">:</span> <span className="text-[#ff6600]/70">29.99</span><span className="text-[#666]">,</span></div>
        <div className="pl-5"><span className="text-[#999]">currency</span><span className="text-[#666]">:</span> <span className="text-[#ff6600]/70">&quot;USD&quot;</span></div>
        <div className="pl-3"><span className="text-[#666]">{"}"}</span></div>
        <div><span className="text-[#666]">);</span></div>
      </div>
    </div>
  );
}

function MultiChainMockup() {
  const chains = [
    { name: "Ethereum", tokens: "ETH, USDT, USDC", color: "#627EEA" },
    { name: "Solana", tokens: "SOL", color: "#9945FF" },
    { name: "Monero", tokens: "XMR", color: "#FF6600" },
    { name: "Bitcoin", tokens: "BTC", color: "#F7931A" },
    { name: "Tron", tokens: "TRX, USDT", color: "#FF0013" },
  ];

  return (
    <div className="space-y-1.5">
      {chains.map((chain) => (
        <div key={chain.name} className="flex items-center justify-between rounded-lg border border-[#1e1e24] bg-[#0a0a0e] px-3 py-2">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: chain.color }} />
            <span className="text-[11px] font-medium text-[#ccc]">{chain.name}</span>
          </div>
          <span className="font-mono text-[10px] text-[#555]">{chain.tokens}</span>
        </div>
      ))}
    </div>
  );
}

function WebhookMockup() {
  return (
    <div className="rounded-lg border border-[#1e1e24] bg-[#0a0a0e] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#1e1e24] px-3 py-2">
        <span className="text-[10px] text-[#555] uppercase tracking-wider">Webhook Log</span>
        <span className="inline-flex h-4 items-center rounded bg-emerald-500/15 px-1.5 text-[9px] font-medium text-emerald-400">LIVE</span>
      </div>
      <div className="divide-y divide-[#1a1a22]">
        {[
          { event: "payment.completed", status: "200", time: "12ms" },
          { event: "payment.confirming", status: "200", time: "8ms" },
          { event: "invoice.created", status: "200", time: "15ms" },
        ].map((log, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2">
            <span className="font-mono text-[10px] text-[#999]">{log.event}</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-emerald-400">{log.status}</span>
              <span className="font-mono text-[10px] text-[#444]">{log.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrivacyMockup() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-lg border border-[#1e1e24] bg-[#0a0a0e] px-3 py-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10">
          <Shield size={12} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#ccc]">No KYC Required</p>
          <p className="text-[9px] text-[#555]">Email-only sign up</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-[#1e1e24] bg-[#0a0a0e] px-3 py-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#ff6600]/10">
          <Globe size={12} className="text-[#ff6600]" />
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#ccc]">Non-Custodial</p>
          <p className="text-[9px] text-[#555]">Direct-to-wallet settlement</p>
        </div>
      </div>
      <div className="rounded-lg border border-dashed border-[#1e1e24] bg-[#08080c] px-3 py-2.5">
        <p className="font-mono text-[10px] text-[#444] text-center">
          HMAC-SHA512 signed webhooks
        </p>
      </div>
    </div>
  );
}

/* ─── Features section ────────────────────────────────────── */

export function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current) return;

      // Heading — scrub fade in/out
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

      // Crystal — scrub fade in/out
      const crystalTl = gsap.timeline({
        scrollTrigger: {
          trigger: "[data-crystal-3d]",
          start: "top 95%",
          end: "top -20%",
          scrub: 2,
        },
      });
      crystalTl.fromTo("[data-crystal-3d]",
        { opacity: 0, scale: 0.85, y: 50 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5 }
      );
      crystalTl.to("[data-crystal-3d]",
        { opacity: 0, duration: 0.4 }, 0.6
      );

      // Cards — scrub fade in/out
      const cards = sectionRef.current.querySelectorAll("[data-bento-card]");
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
        {/* 3D Crystal logo */}
        <div
          data-crystal-3d
          className="relative mx-auto mb-12 h-[280px] w-[280px] sm:h-[360px] sm:w-[360px]"
        >
          <CrystalScene className="h-full w-full" />
        </div>

        {/* Section heading */}
        <div data-features-heading className="mb-16">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            What you actually get
          </h2>
          <p className="mt-4 max-w-lg text-lg text-foreground-secondary leading-relaxed">
            REST API, webhooks, multi-chain support, no KYC.
            That&apos;s the product.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1 — API (large, spans 2 cols) */}
          <div
            data-bento-card
            className="sm:col-span-2 rounded-2xl border border-border bg-surface p-6 sm:p-8 flex flex-col sm:flex-row gap-6 sm:gap-10 transition-colors hover:border-border-hover"
          >
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Code2 size={16} className="text-muted" strokeWidth={1.5} />
                  <span className="text-[11px] font-medium text-muted uppercase tracking-wider">API</span>
                </div>
                <h3 className="font-heading text-xl font-semibold mb-3">
                  Three lines of code
                </h3>
                <p className="text-sm text-foreground-secondary leading-relaxed max-w-sm">
                  A single REST endpoint creates a payment. Webhooks notify your server when funds arrive. No SDKs required.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-6">
                <div>
                  <p className="font-heading text-xl font-bold">1</p>
                  <p className="text-[10px] text-muted uppercase tracking-wider mt-0.5">Endpoint</p>
                </div>
                <div className="h-6 w-px bg-border" />
                <div>
                  <p className="font-heading text-xl font-bold">5 min</p>
                  <p className="text-[10px] text-muted uppercase tracking-wider mt-0.5">Integration</p>
                </div>
                <div className="h-6 w-px bg-border" />
                <div>
                  <p className="font-heading text-xl font-bold">0</p>
                  <p className="text-[10px] text-muted uppercase tracking-wider mt-0.5">Dependencies</p>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <ApiMockup />
            </div>
          </div>

          {/* Card 2 — Privacy */}
          <div
            data-bento-card
            className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-border-hover"
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-muted" strokeWidth={1.5} />
              <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Privacy</span>
            </div>
            <h3 className="font-heading text-lg font-semibold mb-2">
              No customer data leaves your server
            </h3>
            <p className="text-sm text-foreground-secondary leading-relaxed mb-5">
              No KYC, no tracking, no data brokers. XMR support is first-party and native — not a plugin.
            </p>
            <PrivacyMockup />
          </div>

          {/* Card 3 — Multi-chain */}
          <div
            data-bento-card
            className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-border-hover"
          >
            <div className="flex items-center gap-2 mb-4">
              <Globe size={16} className="text-muted" strokeWidth={1.5} />
              <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Multi-chain</span>
            </div>
            <h3 className="font-heading text-lg font-semibold mb-2">
              Your customer pays in what they have
            </h3>
            <p className="text-sm text-foreground-secondary leading-relaxed mb-5">
              ETH, BTC, SOL, XMR, TRX, BNB, USDT, USDC — one API, unified interface across 5 chains.
            </p>
            <MultiChainMockup />
          </div>

          {/* Card 4 — Webhooks (spans 2 cols) */}
          <div
            data-bento-card
            className="sm:col-span-2 rounded-2xl border border-border bg-surface p-6 sm:p-8 flex flex-col sm:flex-row gap-6 sm:gap-10 transition-colors hover:border-border-hover"
          >
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={16} className="text-muted" strokeWidth={1.5} />
                  <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Webhooks</span>
                </div>
                <h3 className="font-heading text-xl font-semibold mb-3">
                  Know the moment funds arrive
                </h3>
                <p className="text-sm text-foreground-secondary leading-relaxed max-w-sm">
                  HMAC-SHA512 signed callbacks for every payment event. Your backend stays in sync without polling.
                </p>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <WebhookMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
