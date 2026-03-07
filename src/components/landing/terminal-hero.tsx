"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowRight, ChevronRight, X, BarChart3, Wallet, ArrowLeftRight, TrendingUp, Settings } from "lucide-react";
import Link from "next/link";
gsap.registerPlugin(ScrollTrigger);

/* ─── Crypto icons (colored dots) ────────────────────────── */
const CRYPTO_DOT: Record<string, string> = {
  BTC: "#F7931A",
  ETH: "#627EEA",
  XMR: "#FF6600",
  SOL: "#9945FF",
  USDT: "#26A17B",
};

/* ─── Sidebar items ──────────────────────────────────────── */
const SIDEBAR_ITEMS = [
  { label: "Dashboard", icon: BarChart3, active: false },
  { label: "Wallet", icon: Wallet, active: true },
  { label: "Payments", icon: ArrowLeftRight, active: false },
  { label: "Analytics", icon: TrendingUp, active: false },
  { label: "Settings", icon: Settings, active: false },
];

/* ─── Wallet assets ──────────────────────────────────────── */
const ASSETS = [
  { name: "Bitcoin", symbol: "BTC", amount: "0.23234145", color: "#F7931A" },
  { name: "Ethereum", symbol: "ETH", amount: "4.8921", color: "#627EEA" },
  { name: "Monero", symbol: "XMR", amount: "12.847", color: "#FF6600" },
  { name: "Solana", symbol: "SOL", amount: "89.12", color: "#9945FF" },
];

/* ─── SVG Sparkline ──────────────────────────────────────── */
function Sparkline() {
  return (
    <svg viewBox="0 0 120 40" className="w-full h-10" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff6600" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ff6600" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,35 L8,32 L16,28 L24,30 L32,25 L40,22 L48,24 L56,18 L64,20 L72,15 L80,12 L88,14 L96,8 L104,10 L112,6 L120,4"
        fill="none"
        stroke="#ff6600"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M0,35 L8,32 L16,28 L24,30 L32,25 L40,22 L48,24 L56,18 L64,20 L72,15 L80,12 L88,14 L96,8 L104,10 L112,6 L120,4 L120,40 L0,40 Z"
        fill="url(#spark-fill)"
      />
      <circle cx="120" cy="4" r="2.5" fill="#ff6600" opacity="0.8">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* ─── Dashboard mockup — Wallet + Swap (Cryptfy style) ───── */
function DashboardMockup() {
  return (
    <div data-dashboard-mockup className="relative mx-auto w-full max-w-5xl" style={{ opacity: 0 }}>
      {/* Glow behind */}
      <div
        className="absolute -inset-8 rounded-[32px] blur-3xl animate-glow-pulse"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(255,102,0,0.08) 0%, transparent 70%)",
        }}
      />

      {/* ── Desktop mockup ── */}
      <div
        data-mockup-desktop
        className="hidden md:block relative rounded-[24px] border border-white/[0.06] overflow-hidden"
        style={{
          background: "rgba(12, 14, 16, 0.8)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 0 60px rgba(255,102,0,0.06), 0 0 120px rgba(255,102,0,0.03), 0 25px 50px rgba(0,0,0,0.4)",
          transform: "perspective(1200px) rotateX(2deg)",
          transformOrigin: "center bottom",
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-white/[0.03] px-3 py-1">
              <span className="font-mono text-[11px] text-[#555]">app.neetpay.com/wallet</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#555]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-subtle" />
            live
          </div>
        </div>

        <div className="flex min-h-[380px]">
          {/* Sidebar */}
          <div className="w-48 shrink-0 border-r border-white/[0.04] py-4 px-3">
            <div className="flex items-center gap-1 px-2 mb-6">
              <span className="font-heading text-sm font-bold text-white">neet</span>
              <span className="font-heading text-sm font-bold text-primary">pay</span>
            </div>
            <p className="px-3 mb-2 text-[9px] uppercase tracking-[0.15em] text-[#444]">Main</p>
            {SIDEBAR_ITEMS.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12px] mb-0.5 transition-colors ${
                  item.active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-[#555] hover:text-[#888]"
                }`}
              >
                <item.icon size={14} />
                {item.label}
              </div>
            ))}
          </div>

          {/* Main — Wallet */}
          <div data-wallet-panel className="flex-1 p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-medium text-white">Wallet</h3>
              <div className="flex items-center gap-2 rounded-full bg-white/[0.03] border border-white/[0.06] px-3 py-1">
                <span className="w-2 h-2 rounded-full" style={{ background: CRYPTO_DOT.BTC }} />
                <span className="font-mono text-[11px] text-[#777]">0x24534...f23</span>
              </div>
            </div>

            {/* Portfolio summary */}
            <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-5 mb-4">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Portfolio balance</p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-heading text-3xl font-bold text-white tabular-nums">$98,230</span>
                    <span className="font-heading text-xl font-bold text-[#555] tabular-nums">.02</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] text-emerald-400 font-medium">+0.23%</span>
                    <span className="text-[10px] text-[#444]">1d</span>
                    <span className="text-[11px] text-emerald-400 font-medium">+$245.24</span>
                  </div>
                </div>
                <div className="w-32">
                  <Sparkline />
                </div>
              </div>
            </div>

            {/* Top assets */}
            <p className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Top assets</p>
            <div className="space-y-1">
              {ASSETS.map((asset) => (
                <div
                  key={asset.symbol}
                  data-asset-row
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${asset.color}20` }}>
                      <div className="w-3 h-3 rounded-full" style={{ background: asset.color }} />
                    </div>
                    <div>
                      <p className="text-[12px] text-white font-medium">{asset.name}</p>
                      <p className="text-[10px] text-[#555]">{asset.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[12px] text-[#ccc]">{asset.amount}</p>
                    <p className="text-[10px] text-emerald-400">+2.4%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Swap panel */}
          <div data-swap-panel className="w-72 shrink-0 border-l border-white/[0.04] p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-medium text-white">Swap</h3>
              <button className="text-[#555] hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* FROM */}
            <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-[#555] uppercase tracking-wider">From</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[#555]">Available:</span>
                  <span className="text-[10px] text-[#999] font-medium tabular-nums">23,234.23</span>
                  <span className="text-[9px] text-primary font-semibold ml-1 cursor-pointer">MAX</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: `${CRYPTO_DOT.BTC}20` }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: CRYPTO_DOT.BTC }} />
                  </div>
                  <span className="text-[13px] text-white font-medium">Bitcoin</span>
                  <ChevronRight size={12} className="text-[#555] rotate-90" />
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-semibold text-white tabular-nums">7,235<span className="text-[#555]">.02</span></p>
                  <p className="text-[10px] text-[#555]">~$23,234</p>
                </div>
              </div>
            </div>

            {/* Swap icon */}
            <div className="flex justify-center -my-1.5 relative z-10">
              <div className="w-8 h-8 rounded-full border border-white/[0.06] bg-[#0c0e10] flex items-center justify-center">
                <ArrowLeftRight size={12} className="text-primary" />
              </div>
            </div>

            {/* TO */}
            <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-4 mt-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-[#555] uppercase tracking-wider">To</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: `${CRYPTO_DOT.ETH}20` }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: CRYPTO_DOT.ETH }} />
                  </div>
                  <span className="text-[13px] text-white font-medium">Ethereum</span>
                  <ChevronRight size={12} className="text-[#555] rotate-90" />
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-semibold text-[#444] tabular-nums">0.00</p>
                </div>
              </div>
            </div>

            {/* Confirm button */}
            <button
              data-confirm-btn
              className="w-full mt-5 py-3 rounded-2xl bg-primary text-black text-sm font-semibold hover:bg-primary-hover transition-all"
            >
              Confirm Swap
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile mockup ── */}
      <div className="md:hidden relative rounded-2xl border border-white/[0.06] overflow-hidden"
        style={{
          background: "rgba(12, 14, 16, 0.8)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 0 40px rgba(255,102,0,0.05), 0 15px 40px rgba(0,0,0,0.4)",
        }}
      >
        <div className="flex items-center justify-between border-b border-white/[0.04] px-4 py-2.5">
          <div className="flex items-center gap-1">
            <span className="font-heading text-xs font-bold text-white">neet</span>
            <span className="font-heading text-xs font-bold text-primary">pay</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#555]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-subtle" />
            live
          </div>
        </div>
        <div className="p-4">
          <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Portfolio balance</p>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="font-heading text-2xl font-bold text-white tabular-nums">$98,230</span>
            <span className="font-heading text-lg font-bold text-[#555] tabular-nums">.02</span>
          </div>
          <span className="text-[11px] text-emerald-400 font-medium">+0.23% (+$245.24)</span>
        </div>
        <div className="border-t border-white/[0.04] divide-y divide-white/[0.04]">
          {ASSETS.slice(0, 3).map((asset) => (
            <div key={asset.symbol} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: `${asset.color}20` }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: asset.color }} />
                </div>
                <p className="text-[12px] text-white">{asset.name}</p>
              </div>
              <p className="font-mono text-[11px] text-[#ccc]">{asset.amount}</p>
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

      // Reset all animated elements to their initial hidden state first
      const resetTargets = [
        "[data-hero-headline]",
        "[data-hero-accent]",
        "[data-hero-sub]",
        "[data-hero-cta]",
        "[data-hero-trust]",
        "[data-dashboard-mockup]",
        "[data-wallet-panel]",
        "[data-swap-panel]",
      ];
      resetTargets.forEach((sel) => {
        gsap.set(sel, { clearProps: "all" });
      });
      gsap.set("[data-asset-row]", { clearProps: "all" });
      gsap.set("[data-cta-btn]", { clearProps: "boxShadow" });
      gsap.set("[data-confirm-btn]", { clearProps: "boxShadow" });

      /* ── Entrance timeline ── */
      const tl = gsap.timeline({ delay: 0.2 });

      /* Phase 1 — headline */
      tl.fromTo("[data-hero-headline]", {
        opacity: 0,
        y: 40,
      }, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power3.out",
      }, 0.4);

      tl.fromTo("[data-hero-accent]", {
        opacity: 0,
        y: 20,
        scale: 0.95,
      }, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        ease: "power3.out",
      }, 0.7);

      /* Phase 2 — Subtitle + CTA */
      tl.fromTo("[data-hero-sub]", {
        y: 20,
        opacity: 0,
      }, {
        y: 0,
        opacity: 1,
        duration: 0.5,
        ease: "power3.out",
      }, 1.0);

      tl.fromTo("[data-hero-cta]", {
        y: 15,
        opacity: 0,
        scale: 0.97,
      }, {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: "power3.out",
      }, 1.2);

      tl.fromTo("[data-cta-btn]", {
        boxShadow: "0 0 0 rgba(255,102,0,0)",
      }, {
        boxShadow: "0 0 30px rgba(255,102,0,0.3)",
        duration: 0.8,
        ease: "power2.inOut",
        yoyo: true,
        repeat: 1,
      }, 1.5);

      tl.fromTo("[data-hero-trust]", {
        y: 10,
        opacity: 0,
      }, {
        y: 0,
        opacity: 1,
        duration: 0.4,
        ease: "power3.out",
      }, 1.4);

      /* Phase 3 — Dashboard mockup */
      tl.fromTo("[data-dashboard-mockup]", {
        y: 100,
        opacity: 0,
        scale: 0.92,
      }, {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 1.2,
        ease: "power3.out",
      }, 1.6);

      tl.fromTo("[data-wallet-panel]", {
        x: -30,
        opacity: 0,
      }, {
        x: 0,
        opacity: 1,
        duration: 0.6,
        ease: "power3.out",
      }, 2.2);

      tl.fromTo("[data-swap-panel]", {
        x: 30,
        opacity: 0,
      }, {
        x: 0,
        opacity: 1,
        duration: 0.6,
        ease: "power3.out",
      }, 2.3);

      tl.fromTo("[data-asset-row]", {
        y: 15,
        opacity: 0,
      }, {
        y: 0,
        opacity: 1,
        duration: 0.3,
        stagger: 0.08,
        ease: "power3.out",
      }, 2.5);

      tl.fromTo("[data-confirm-btn]", {
        boxShadow: "0 0 0 rgba(255,102,0,0)",
      }, {
        boxShadow: "0 0 25px rgba(255,102,0,0.25)",
        duration: 0.6,
        ease: "power2.inOut",
        yoyo: true,
        repeat: 1,
      }, 2.8);

      /* ── Scroll fade-out — created AFTER entrance completes ── */
      const fadeTargets = [
        { sel: "[data-hero-headline]", start: "15% top", end: "60% top" },
        { sel: "[data-hero-sub]",      start: "18% top", end: "63% top" },
        { sel: "[data-hero-trust]",    start: "20% top", end: "65% top" },
        { sel: "[data-hero-cta]",      start: "22% top", end: "67% top" },
        { sel: "[data-dashboard-mockup]", start: "25% top", end: "80% top" },
      ];

      tl.call(() => {
        fadeTargets.forEach(({ sel, start, end }) => {
          gsap.fromTo(sel,
            { opacity: 1 },
            {
              opacity: 0,
              ease: "none",
              scrollTrigger: {
                trigger: containerRef.current,
                start,
                end,
                scrub: 1.5,
              },
            }
          );
        });
      });
    },
    { scope: containerRef, revertOnUpdate: true }
  );

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen text-[#f5f5f5] overflow-hidden"
    >
      {/* Content */}
      <div className="relative mx-auto flex flex-col items-center max-w-7xl px-6 pt-24 pb-12 sm:pt-28">
        {/* Headline */}
        <div data-hero-headline className="text-center mb-6" style={{ opacity: 0 }}>
          <h1
            className="font-heading text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95]"
            style={{ textShadow: "0 2px 30px rgba(0,0,0,0.8), 0 0 60px rgba(0,0,0,0.5)" }}
          >
            Accept crypto.
            <br />
            <span data-hero-accent className="text-primary">the way</span>
            <span className="text-[#525252]"> you want.</span>
          </h1>
        </div>

        {/* Subtitle */}
        <p
          data-hero-sub
          className="max-w-lg text-center text-lg text-[#ccc] leading-relaxed mb-8"
          style={{ opacity: 0, textShadow: "0 1px 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.6)" }}
        >
          Safe and easy crypto payments for everyone.
          No KYC, no custody, no middlemen.
        </p>

        {/* Trust anchors */}
        <div
          data-hero-trust
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-[#bbb] mb-8"
          style={{ opacity: 0, textShadow: "0 1px 15px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.7)" }}
        >
          <span><span className="text-white font-medium">0%</span> transaction fees</span>
          <span className="hidden sm:block h-3 w-px bg-[#555]" />
          <span><span className="text-white font-medium">5</span> chains supported</span>
          <span className="hidden sm:block h-3 w-px bg-[#555]" />
          <span className="text-white font-medium">Non-custodial</span>
        </div>

        {/* CTA capsule — input + button */}
        <div
          data-hero-cta
          className="flex flex-col sm:flex-row items-center w-full sm:w-auto mb-8 sm:mb-10"
          style={{ opacity: 0 }}
        >
          <div
            className="flex items-center w-full sm:w-auto max-w-md h-14 rounded-full border border-white/[0.12] pl-6 pr-1.5 gap-3"
            style={{ background: "rgba(8, 8, 12, 0.6)", backdropFilter: "blur(12px)" }}
          >
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-[#888] outline-none min-w-0"
            />
            <Link href="/login">
              <button
                data-cta-btn
                className="shrink-0 flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-black hover:bg-primary-hover transition-all whitespace-nowrap"
              >
                Get Started
                <ArrowRight size={14} />
              </button>
            </Link>
          </div>
        </div>

        {/* Dashboard mockup */}
        <DashboardMockup />
      </div>
    </section>
  );
}
