"use client";

import { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  Paintbrush,
  Link2,
  ArrowRight,
  Lock,
  Check,
  QrCode,
  MousePointer2,
  BadgePercent,
  Coins,
  Network,
  ShieldOff,
} from "lucide-react";
import Link from "next/link";
import { CRYPTO_COLORS } from "@/lib/constants";
import { useCountUp } from "@/hooks/use-count-up";

gsap.registerPlugin(ScrollTrigger);

/* ─── Crypto entries for checkout mockup ─────────────── */

const MOCKUP_CRYPTOS = [
  { symbol: "ETH", name: "Ethereum", amount: "0.0089" },
  { symbol: "XMR", name: "Monero", amount: "0.2341" },
  { symbol: "BTC", name: "Bitcoin", amount: "0.00041" },
] as const;

/* ─── White-label checkout mockup ─────────────────────── */

function CheckoutMockup() {
  const [selected, setSelected] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setSelected((prev) => (prev + 1) % MOCKUP_CRYPTOS.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      gsap.fromTo(
        containerRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", delay: 0.15 }
      );
    },
    { scope: containerRef }
  );

  useEffect(() => {
    if (!selectionRef.current) return;
    gsap.fromTo(
      selectionRef.current,
      { scale: 1.02 },
      { scale: 1, duration: 0.3, ease: "power2.out" }
    );
  }, [selected]);

  const crypto = MOCKUP_CRYPTOS[selected];
  const color = CRYPTO_COLORS[crypto.symbol] ?? "#888";

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl border border-border bg-surface overflow-hidden w-full max-w-[min(360px,100%)] transition-shadow duration-300 hover:shadow-[0_0_40px_rgba(255,102,0,0.08)]"
      style={{ opacity: 0 }}
    >
      {/* Shine sweep */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-2xl" aria-hidden>
        <div className="animate-scanline absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
      </div>

      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-elevated px-3 py-2.5">
        <div className="flex gap-1.5 shrink-0">
          <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-1.5 rounded-md bg-background border border-border px-2.5 py-1">
            <Lock size={8} className="text-muted shrink-0" />
            <span className="font-mono text-[9px] text-muted truncate">
              <span className="text-foreground-secondary">pay.</span>yourstore.com/checkout
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-subtle" />
          <span className="font-mono text-[9px] text-muted">live</span>
        </div>
      </div>

      {/* Checkout body */}
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-white">YS</span>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-foreground">Your Store</p>
            <p className="text-[10px] text-muted">Order #4812</p>
          </div>
        </div>

        <div className="rounded-xl bg-elevated border border-border p-3 text-center">
          <p className="text-[10px] text-muted mb-1 uppercase tracking-wider">Amount due</p>
          <p className="font-heading text-2xl font-bold text-foreground tabular-nums">$29.99</p>
        </div>

        <div className="space-y-1.5">
          <p className="text-[9px] text-muted uppercase tracking-widest px-0.5">Pay with</p>
          {MOCKUP_CRYPTOS.map((c, i) => {
            const isSelected = i === selected;
            const cColor = CRYPTO_COLORS[c.symbol] ?? "#888";
            return (
              <button
                key={c.symbol}
                onClick={() => setSelected(i)}
                ref={isSelected ? selectionRef : undefined}
                className={[
                  "w-full flex items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-200 text-left",
                  isSelected
                    ? "border border-primary/30 bg-primary-muted"
                    : "border border-border bg-elevated hover:border-border-hover",
                ].join(" ")}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${cColor}18` }}
                  >
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cColor }} />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground leading-none">{c.symbol}</p>
                    <p className="text-[9px] text-muted mt-0.5">{c.name}</p>
                  </div>
                </div>
                {isSelected ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10px] text-foreground-secondary tabular-nums">{c.amount}</span>
                    <div className="h-4 w-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: cColor }}>
                      <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                        <path d="M1.5 3.5L3 5L5.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-border shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <button
          className="w-full rounded-xl py-3 text-center text-[12px] font-semibold text-black transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
          style={{ backgroundColor: color }}
        >
          Pay {crypto.amount} {crypto.symbol}
        </button>

        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          <span className="text-[9px] text-muted">Secured by</span>
          <span className="text-[9px] font-semibold tracking-tight">
            <span className="text-foreground-secondary">neet</span>
            <span className="text-primary">pay</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Mini sparkline bars ─────────────────────────────── */

function MiniBarChart({ heights, color }: { heights: readonly number[]; color: string }) {
  return (
    <svg width="36" height="20" viewBox="0 0 36 20" fill="none">
      {heights.map((h, i) => (
        <rect key={i} x={i * 8} y={20 - h * 0.32} width="5" height={h * 0.32} rx="1.5" fill={color} opacity="0.7" />
      ))}
    </svg>
  );
}

/* ─── Payment link mockup ─────────────────────────────── */

const STATUS_STYLE = {
  active: { bg: "bg-emerald-500/15", text: "text-emerald-400", dot: "bg-emerald-400" },
  paused: { bg: "bg-amber-500/15", text: "text-amber-400", dot: "bg-amber-400" },
  draft: { bg: "bg-neutral-500/15", text: "text-neutral-400", dot: "bg-neutral-400" },
} as const;

const BAR_COLOR = { active: "#22c55e", paused: "#f59e0b", draft: "#55556a" } as const;

const LINKS_DATA = [
  { label: "Pro Plan — Monthly", amount: "$29.00", clicks: 142, conv: "34%", revenue: "$4,118", status: "active" as const, barHeights: [30, 45, 35, 60, 50] as const },
  { label: "Design Workshop", amount: "$199.00", clicks: 38, conv: "22%", revenue: "$7,562", status: "paused" as const, barHeights: [50, 40, 55, 35, 20] as const },
  { label: "Consultation 1h", amount: "$75.00", clicks: 91, conv: "41%", revenue: "$2,737", status: "active" as const, barHeights: [20, 30, 25, 35, 30] as const },
] as const;

function PaymentLinkMockup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  useGSAP(
    () => {
      if (!containerRef.current) return;
      const countEls = containerRef.current.querySelectorAll<HTMLSpanElement>("[data-click-count]");
      countEls.forEach((el) => {
        const target = parseInt(el.getAttribute("data-click-target") ?? "0", 10);
        const proxy = { value: 0 };
        gsap.to(proxy, {
          value: target,
          duration: 1.8,
          ease: "power3.out",
          scrollTrigger: { trigger: containerRef.current, start: "top 85%", toggleActions: "play none none none" },
          onUpdate: () => { el.textContent = Math.round(proxy.value).toLocaleString(); },
        });
      });
    },
    { scope: containerRef }
  );

  function handleCopy() {
    navigator.clipboard.writeText("pay.neetpay.com/l/pro-plan-monthly").catch(() => {});
    setCopyState("copied");
    setTimeout(() => setCopyState("idle"), 1500);
  }

  return (
    <div ref={containerRef} className="w-full max-w-[min(360px,100%)] space-y-2">
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(10,10,14,0.72)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
        }}
      >
        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-white/[0.05] px-3 py-2">
          <div className="flex items-center gap-2">
            <Link2 size={10} className="text-[#555]" />
            <span className="text-[10px] text-[#555]">Payment Links</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-subtle" />
            <span className="text-[9px] text-[#555]">live</span>
          </div>
          {/* Toast */}
          <div className="absolute -top-0.5 right-3 z-10" style={{ animation: "slide-down 0.4s ease-out 1.2s both" }}>
            <div
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
              style={{ background: "rgba(14,14,20,0.92)", border: "1px solid rgba(34,197,94,0.25)", backdropFilter: "blur(8px)", boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <div>
                <p className="text-[9px] font-medium text-[#ccc] whitespace-nowrap">New payment received</p>
                <p className="text-[8px] text-[#555] whitespace-nowrap">0.5 XMR &middot; 2s ago</p>
              </div>
            </div>
          </div>
        </div>

        {/* Link cards */}
        <div className="p-3 space-y-2">
          {LINKS_DATA.map((link, i) => {
            const s = STATUS_STYLE[link.status];
            return (
              <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-[#ccc] truncate leading-tight">{link.label}</p>
                    <p className="font-mono text-[10px] text-[#ff6600]/80 mt-0.5">{link.amount}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <MousePointer2 size={8} className="text-[#444] shrink-0" />
                      <span data-click-count data-click-target={link.clicks} className="text-[10px] font-mono font-medium text-[#888] tabular-nums">0</span>
                      <span className="text-[9px] text-[#444]">clicks</span>
                      <span className="text-[9px] text-[#333]">/</span>
                      <span className="text-[9px] text-emerald-400/70">{link.conv}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <MiniBarChart heights={link.barHeights} color={BAR_COLOR[link.status]} />
                    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[8px] font-medium ${s.bg} ${s.text}`}>
                      <span className={`w-1 h-1 rounded-full ${s.dot}`} />
                      {link.status}
                    </span>
                    <span className="font-mono text-[9px] text-[#555]">{link.revenue}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Share strip */}
      <div
        className="rounded-xl p-3"
        style={{
          background: "rgba(10,10,14,0.72)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,102,0,0.15)",
          boxShadow: "0 2px 16px rgba(255,102,0,0.04)",
        }}
      >
        <div className="flex items-center gap-2 mb-2.5">
          <p className="font-mono text-[11px] truncate flex-1 min-w-0">
            <span className="text-[#555]">pay.neetpay.com/l/</span>
            <span className="text-[#ff6600]">pro-plan-monthly</span>
          </p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[9px] font-medium shrink-0 transition-all duration-150"
            style={{
              background: copyState === "copied" ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
              border: copyState === "copied" ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.08)",
              color: copyState === "copied" ? "#22c55e" : "#666",
            }}
          >
            {copyState === "copied" ? <><Check size={9} /> Copied</> : "Copy"}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-[#444] mr-0.5">Share via</span>
            {[
              { bg: "rgba(29,161,242,0.15)", br: "rgba(29,161,242,0.2)", fill: "#1da1f2", d: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" },
              { bg: "rgba(0,136,204,0.15)", br: "rgba(0,136,204,0.2)", fill: "#0088cc", d: "M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.783-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" },
              { bg: "rgba(37,211,102,0.15)", br: "rgba(37,211,102,0.2)", fill: "#25d366", d: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" },
            ].map((s, i) => (
              <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: s.bg, border: `1px solid ${s.br}` }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill={s.fill}><path d={s.d} /></svg>
              </div>
            ))}
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <QrCode size={9} className="text-[#555]" />
            </div>
          </div>
          <span className="text-[9px] text-[#333]">No website needed</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Stat card with count-up ─────────────────────────── */

function StatCard({
  icon: Icon, value, label, sublabel, prominent, countTarget, countSuffix = "", countFrom, countDecimals = 0,
}: {
  icon: typeof BadgePercent; value: string; label: string; sublabel: string;
  prominent?: boolean; countTarget?: number; countSuffix?: string; countFrom?: number; countDecimals?: number;
}) {
  const standardCount = useCountUp<HTMLSpanElement>(countTarget ?? 0, { duration: 1.6, suffix: countSuffix, decimals: countDecimals });

  const countDownRef = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    if (countFrom === undefined || countTarget !== 0 || !countDownRef.current) return;
    const proxy = { value: countFrom };
    gsap.to(proxy, {
      value: 0, duration: 1.8, ease: "power3.out",
      scrollTrigger: { trigger: countDownRef.current, start: "top 85%", toggleActions: "play none none none" },
      onUpdate: () => { if (countDownRef.current) countDownRef.current.textContent = proxy.value.toFixed(countDecimals) + countSuffix; },
    });
  }, { scope: countDownRef });

  const isCountDown = countFrom !== undefined && countTarget === 0;
  const isStatic = countTarget === undefined;

  return (
    <div className={["relative rounded-2xl border p-5 sm:p-6 flex flex-col gap-3 transition-colors", prominent ? "border-border-hover bg-elevated hover:border-primary/30" : "border-border bg-surface hover:border-border-hover"].join(" ")}>
      {prominent && (
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,102,0,0.06) 0%, transparent 65%)" }} />
      )}
      <div className={["flex h-8 w-8 items-center justify-center rounded-lg border", prominent ? "border-primary/20 bg-primary/10" : "border-border bg-elevated"].join(" ")}>
        <Icon size={15} strokeWidth={1.5} className={prominent ? "text-primary" : "text-muted"} />
      </div>
      <div>
        <p className={["font-heading font-bold tracking-tight leading-none tabular-nums", prominent ? "text-4xl sm:text-5xl text-primary" : "text-3xl sm:text-4xl text-foreground"].join(" ")}>
          {isCountDown ? (
            <span ref={countDownRef}>{countFrom!.toFixed(countDecimals)}{countSuffix}</span>
          ) : isStatic ? value : (
            <span ref={standardCount.ref}>{standardCount.display}</span>
          )}
        </p>
        <p className="mt-1.5 text-[11px] font-medium text-muted uppercase tracking-[0.12em]">{label}</p>
      </div>
      <p className="text-[12px] text-foreground-secondary leading-relaxed">{sublabel}</p>
      {isStatic && prominent && (
        <div className="flex items-center gap-1.5">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-success/15">
            <Check size={9} strokeWidth={2.5} className="text-success" />
          </div>
          <span className="text-[10px] font-semibold text-success uppercase tracking-wider">None required</span>
        </div>
      )}
    </div>
  );
}

const STATS_DATA = [
  { icon: BadgePercent, value: "0%", label: "Transaction fees", sublabel: "vs Stripe's 2.9% + 30¢", prominent: true, countTarget: 0, countFrom: 2.9, countSuffix: "%", countDecimals: 1 },
  { icon: Coins, value: "18+", label: "Cryptocurrencies", sublabel: "BTC, ETH, XMR, SOL and more", prominent: false, countTarget: 18, countSuffix: "+" },
  { icon: Network, value: "5", label: "Chains", sublabel: "EVM · Solana · BTC · TRON · XMR", prominent: false, countTarget: 5 },
  { icon: ShieldOff, value: "0", label: "KYC required", sublabel: "Email only. No ID. No documents.", prominent: true },
] as const;

/* ─── Features section ────────────────────────────────── */

export function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current) return;

      // Heading — one-shot reveal
      const headingTl = gsap.timeline({
        scrollTrigger: { trigger: "[data-features-heading]", start: "top 88%", toggleActions: "play none none none" },
      });
      headingTl
        .fromTo("[data-features-heading] h2", { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.75, ease: "power3.out" })
        .fromTo("[data-features-heading] p", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, 0.2);

      // Feature cards — staggered
      ScrollTrigger.batch("[data-feature-card]", {
        start: "top 88%",
        onEnter(batch) {
          gsap.fromTo(batch, { opacity: 0, y: 50, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.75, ease: "power3.out", stagger: 0.12 });
        },
        once: true,
      });

      // Stats grid reveal
      gsap.fromTo("[data-stats-grid]", { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.6, ease: "power3.out",
        scrollTrigger: { trigger: "[data-stats-grid]", start: "top 90%", toggleActions: "play none none none" },
      });
    },
    { scope: sectionRef, revertOnUpdate: true }
  );

  return (
    <section id="products" ref={sectionRef} className="relative py-24 sm:py-32 overflow-hidden">
      {/* Section ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-[30%] w-[60%] h-[50%]"
        style={{ background: "radial-gradient(ellipse at center, rgba(255,102,0,0.05) 0%, transparent 65%)", filter: "blur(40px)" }}
      />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Heading */}
        <div data-features-heading className="mb-16">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Two ways to accept crypto.{" "}
            <span className="text-muted">Zero ways to get shut down.</span>
          </h2>
          <p className="mt-4 max-w-lg text-lg text-foreground-secondary leading-relaxed">
            Embed a checkout on your site or share a payment link. No processor in the middle. No account reviews. No sudden holds.
          </p>
        </div>

        {/* Two feature cards */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div data-feature-card className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <Paintbrush size={16} className="text-muted" strokeWidth={1.5} />
              <span className="text-[11px] font-medium text-muted uppercase tracking-wider">White-label</span>
            </div>
            <h3 className="font-heading text-2xl font-semibold mb-3 sm:text-3xl">
              Your checkout.{" "}
              <span className="text-muted">Their data goes nowhere else.</span>
            </h3>
            <p className="text-foreground-secondary leading-relaxed max-w-md mb-8">
              Custom domain, your logo, your colors — and no third-party processor watching every transaction. Your customers pay you. That&apos;s where it ends.
            </p>
            <div className="flex justify-center">
              <CheckoutMockup />
            </div>
          </div>

          <div data-feature-card className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <Link2 size={16} className="text-muted" strokeWidth={1.5} />
              <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Payment Links</span>
            </div>
            <h3 className="font-heading text-2xl font-semibold mb-3 sm:text-3xl">
              A link.{" "}
              <span className="text-muted">That&apos;s it.</span>
            </h3>
            <p className="text-foreground-secondary leading-relaxed max-w-md mb-8">
              No website, no integration, no KYC form. Generate a payment link in 30 seconds, share it anywhere, get paid in 18+ cryptocurrencies.
            </p>
            <div className="flex justify-center">
              <PaymentLinkMockup />
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div data-stats-grid className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STATS_DATA.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        {/* CTA row */}
        <div data-feature-card className="mt-3 glass rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-foreground-secondary text-center sm:text-left">
            Non-custodial. Self-hosted option.{" "}
            <span className="text-foreground">No vendor lock-in.</span>
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors shrink-0"
          >
            Start for free
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
