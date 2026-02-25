"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";

/* ─── Dashboard mockup data ───────────────────────────────── */
const RECENT_TXS = [
  { id: "np_7x9k2m", crypto: "XMR", amount: "0.184 XMR", usd: "$29.99", status: "paid", time: "2m ago" },
  { id: "np_3f8a1c", crypto: "BTC", amount: "0.00041 BTC", usd: "$15.00", status: "paid", time: "8m ago" },
  { id: "np_9d2e5b", crypto: "ETH", amount: "0.0089 ETH", usd: "$24.50", status: "confirming", time: "12m ago" },
  { id: "np_1k7p3q", crypto: "USDT", amount: "50.00 USDT", usd: "$50.00", status: "paid", time: "19m ago" },
  { id: "np_5m2n8r", crypto: "SOL", amount: "0.347 SOL", usd: "$42.00", status: "paid", time: "31m ago" },
];

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-400",
  confirming: "bg-blue-500/15 text-blue-400",
  pending: "bg-yellow-500/15 text-yellow-400",
};

/* ─── Dashboard mockup — responsive ──────────────────────── */
function DashboardMockup() {
  return (
    <div
      data-dashboard-mockup
      className="relative mx-auto w-full max-w-5xl"
    >
      {/* Glow behind the card */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#ff660012] via-transparent to-transparent" />

      {/* Full mockup — desktop */}
      <div className="hidden md:block relative rounded-2xl border border-[#1e1e24] bg-[#0c0c10] overflow-hidden shadow-2xl shadow-black/60">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-[#1e1e24] px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#2a2a32]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#2a2a32]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#2a2a32]" />
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-[#14141a] px-3 py-1">
              <span className="font-mono text-[11px] text-[#555]">app.neetpay.com/dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#555]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-subtle" />
            live
          </div>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-52 shrink-0 border-r border-[#1e1e24] py-4 px-3">
            <div className="flex items-center gap-2 px-2 mb-6">
              <span className="font-heading text-sm font-bold text-[#e5e5e5]">neet</span>
              <span className="font-heading text-sm font-bold text-primary">pay</span>
            </div>
            {["Overview", "Payments", "Payment Links", "Analytics", "Developers", "Settings"].map((item, i) => (
              <div
                key={item}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] mb-0.5 ${
                  i === 0
                    ? "bg-[#18181e] text-[#e5e5e5] font-medium"
                    : "text-[#666] hover:text-[#999]"
                }`}
              >
                <div className={`h-3.5 w-3.5 rounded ${i === 0 ? "bg-[#2a2a32]" : "bg-[#1a1a22]"}`} />
                {item}
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 p-5">
            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: "Today's Volume", value: "$1,247.50", change: "+12.3%" },
                { label: "Transactions", value: "47", change: "+8" },
                { label: "Conversion Rate", value: "94.2%", change: "+2.1%" },
                { label: "Active Invoices", value: "3", change: "" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-[#1e1e24] bg-[#111116] p-3.5">
                  <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1.5">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-heading text-lg font-semibold text-[#e5e5e5]">{stat.value}</span>
                    {stat.change && (
                      <span className="text-[10px] text-emerald-400 font-medium">{stat.change}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Transaction table */}
            <div className="rounded-xl border border-[#1e1e24] bg-[#111116] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e24]">
                <span className="text-[11px] font-medium text-[#999] uppercase tracking-wider">Recent Payments</span>
                <span className="text-[10px] text-[#555] flex items-center gap-1 cursor-default">
                  View all <ChevronRight size={10} />
                </span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1a1a22]">
                    {["ID", "Amount", "USD", "Status", "Time"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2 text-left text-[10px] font-medium text-[#444] uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RECENT_TXS.map((tx) => (
                    <tr key={tx.id} className="border-b border-[#1a1a22] last:border-0">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-[#777]">{tx.id}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-[#ccc]">{tx.amount}</td>
                      <td className="px-4 py-2.5 text-[11px] text-[#999]">{tx.usd}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[tx.status]}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-[#555]">{tx.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Simplified mobile mockup */}
      <div className="md:hidden relative rounded-2xl border border-[#1e1e24] bg-[#0c0c10] overflow-hidden shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-[#1e1e24] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="font-heading text-xs font-bold text-[#e5e5e5]">neet</span>
            <span className="font-heading text-xs font-bold text-primary">pay</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#555]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-subtle" />
            live
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3">
          {[
            { label: "Today's Volume", value: "$1,247.50", change: "+12.3%" },
            { label: "Conversion", value: "94.2%", change: "+2.1%" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-[#1e1e24] bg-[#111116] p-3">
              <p className="text-[9px] text-[#555] uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="font-heading text-base font-semibold text-[#e5e5e5]">{stat.value}</p>
              <p className="text-[9px] text-emerald-400 font-medium">{stat.change}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-[#1e1e24] divide-y divide-[#1a1a22]">
          {RECENT_TXS.slice(0, 3).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="font-mono text-[10px] text-[#777]">{tx.id}</p>
                <p className="font-mono text-[11px] text-[#ccc]">{tx.usd}</p>
              </div>
              <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[tx.status]}`}>
                {tx.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Hero section ────────────────────────────────────────── */
export function TerminalHero() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const tl = gsap.timeline({ delay: 0.15 });

      tl.from("[data-hero-tagline]", {
        opacity: 0,
        y: 8,
        duration: 0.4,
        ease: "power3.out",
      });

      tl.from(
        "[data-hero-headline]",
        {
          opacity: 0,
          y: 20,
          duration: 0.6,
          ease: "power3.out",
        },
        "-=0.15"
      );

      tl.from(
        "[data-hero-sub]",
        {
          y: 15,
          opacity: 0,
          duration: 0.5,
          ease: "power3.out",
        },
        "-=0.25"
      );

      tl.from(
        "[data-hero-trust]",
        {
          y: 10,
          opacity: 0,
          duration: 0.4,
          ease: "power3.out",
        },
        "-=0.2"
      );

      tl.from(
        "[data-hero-ctas]",
        {
          y: 15,
          opacity: 0,
          duration: 0.5,
          ease: "power3.out",
        },
        "-=0.2"
      );

      tl.from(
        "[data-dashboard-mockup]",
        {
          y: 60,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
        },
        "-=0.3"
      );
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen bg-[#08080c] text-[#f5f5f5] overflow-hidden"
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Radial fade at edges */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, transparent 50%, #08080c 100%)",
        }}
      />

      <div className="relative mx-auto flex flex-col items-center max-w-7xl px-6 pt-28 pb-16 sm:pt-36">
        {/* Tagline — the strongest copy, now visible */}
        <p
          data-hero-tagline
          className="font-mono text-xs text-primary uppercase tracking-[0.2em] mb-6"
        >
          Pay without permission.
        </p>

        {/* Headline — confrontational, instant */}
        <div data-hero-headline className="text-center mb-6">
          <h1 className="font-heading text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95]">
            Accept crypto.
            <br />
            <span className="text-[#525252]">Answer to no one.</span>
          </h1>
        </div>

        {/* Subtitle — names the enemy, then the solution */}
        <p
          data-hero-sub
          className="max-w-lg text-center text-lg text-[#777] leading-relaxed mb-8"
        >
          The payment gateway that can&apos;t deplatform you.
          No KYC, no custody, no middlemen. One API call to get paid.
        </p>

        {/* Trust anchors — honest, verifiable metrics */}
        <div data-hero-trust className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-[#555] mb-8">
          <span><span className="text-[#999] font-medium">0%</span> transaction fees</span>
          <span className="hidden sm:block h-3 w-px bg-[#2a2a32]" />
          <span><span className="text-[#999] font-medium">5</span> chains supported</span>
          <span className="hidden sm:block h-3 w-px bg-[#2a2a32]" />
          <span className="text-[#999] font-medium">Non-custodial</span>
        </div>

        {/* CTAs — stack on mobile, specific copy */}
        <div data-hero-ctas className="flex flex-col sm:flex-row items-center gap-3 mb-14 sm:mb-16 w-full sm:w-auto">
          <Link href="/register" className="w-full sm:w-auto">
            <Button size="lg" className="h-12 w-full sm:w-auto px-8 text-base font-semibold">
              Get your API key
              <ArrowRight size={16} />
            </Button>
          </Link>
          <Link href="#how-it-works" className="w-full sm:w-auto">
            <Button
              variant="secondary"
              size="lg"
              className="h-12 w-full sm:w-auto px-8 border-[#1e1e24] bg-[#0f0f14] text-[#777] hover:text-[#e5e5e5] hover:bg-[#151519] hover:border-[#2a2a32]"
            >
              See how it works
            </Button>
          </Link>
        </div>

        {/* Dashboard mockup */}
        <DashboardMockup />
      </div>
    </section>
  );
}
