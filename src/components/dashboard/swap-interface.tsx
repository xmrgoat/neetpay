"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CRYPTO_COLORS } from "@/lib/constants";
import {
  ArrowDownUp,
  ArrowLeft,
  ChevronDown,
  Search,
  AlertCircle,
  RefreshCw,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CryptoHolding {
  currency: string;
  amount: number;
  usdValue: number;
  price?: number;
  change24h?: number;
}

interface SwapInterfaceProps {
  holdings: CryptoHolding[];
  onBack?: () => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CRYPTO_NAMES: Record<string, string> = {
  BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", XMR: "Monero",
  USDT: "Tether", USDC: "USD Coin", TRX: "Tron", BNB: "BNB",
  LTC: "Litecoin", DOGE: "Dogecoin", TON: "Toncoin", XRP: "Ripple",
};

const CRYPTO_ICONS: Record<string, string> = {
  BTC: "₿", ETH: "Ξ", SOL: "◎", XMR: "ɱ",
  USDT: "₮", USDC: "$", TRX: "◈", BNB: "◆",
  LTC: "Ł", DOGE: "Ð", TON: "◇", XRP: "✕",
};

const FEE_RATE = 0.005; // 0.5%

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCryptoAmount(amount: number): string {
  if (amount === 0) return "0";
  if (amount >= 1_000) return amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (amount >= 1) return amount.toFixed(4);
  if (amount >= 0.001) return amount.toFixed(6);
  return amount.toFixed(8);
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getExchangeRate(fromPrice: number, toPrice: number): number {
  if (toPrice === 0) return 0;
  return fromPrice / toPrice;
}

// ─── Crypto Selector Dropdown ───────────────────────────────────────────────

function CryptoSelector({
  selected,
  holdings,
  onSelect,
  exclude,
}: {
  selected: string;
  holdings: CryptoHolding[];
  onSelect: (currency: string) => void;
  exclude?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    let list = holdings.filter((h) => h.currency !== exclude);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((h) => {
        const name = CRYPTO_NAMES[h.currency] ?? h.currency;
        return h.currency.toLowerCase().includes(q) || name.toLowerCase().includes(q);
      });
    }
    return list;
  }, [holdings, exclude, search]);

  const color = CRYPTO_COLORS[selected] ?? "#737373";
  const icon = CRYPTO_ICONS[selected] ?? selected.slice(0, 1);
  const name = CRYPTO_NAMES[selected] ?? selected;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useGSAP(() => {
    if (!open || !dropdownRef.current) return;
    const dropdown = dropdownRef.current.querySelector("[data-dropdown]");
    if (!dropdown) return;
    gsap.fromTo(dropdown,
      { opacity: 0, y: -6, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power3.out" }
    );
  }, { dependencies: [open] });

  return (
    <div ref={dropdownRef} className={cn("relative", open && "z-50")}>
      <button
        onClick={() => { setOpen(!open); setSearch(""); }}
        className="flex items-center gap-2.5 rounded-xl border border-border bg-surface/60 px-3 py-2.5 transition-all duration-200 hover:bg-surface hover:border-border-hover active:scale-[0.98]"
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 2px 10px ${color}40` }}
        >
          <span className="text-xs font-bold text-white">{icon}</span>
        </div>
        <div className="text-left">
          <p className="text-[13px] font-semibold text-foreground">{selected}</p>
          <p className="text-[10px] text-muted">{name}</p>
        </div>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div
          data-dropdown
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-elevated p-1.5 shadow-xl"
        >
          {/* Search */}
          <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 mb-1.5">
            <Search className="h-3 w-3 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              autoFocus
              className="w-full bg-transparent text-[12px] text-foreground placeholder:text-muted outline-none"
            />
          </div>

          {/* List */}
          <div className="max-h-52 overflow-y-auto no-scrollbar">
            {filtered.map((h) => {
              const c = CRYPTO_COLORS[h.currency] ?? "#737373";
              const ic = CRYPTO_ICONS[h.currency] ?? h.currency.slice(0, 1);
              const n = CRYPTO_NAMES[h.currency] ?? h.currency;
              const isSelected = h.currency === selected;

              return (
                <button
                  key={h.currency}
                  onClick={() => { onSelect(h.currency); setOpen(false); setSearch(""); }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                    isSelected ? "bg-primary-muted" : "hover:bg-surface"
                  )}
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: c }}
                  >
                    <span className="text-[10px] font-bold text-white">{ic}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-foreground">{n}</p>
                    <p className="text-[10px] text-muted">{h.currency}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[11px] font-medium text-foreground-secondary tabular-nums">
                      {formatCryptoAmount(h.amount)}
                    </p>
                    {h.usdValue > 0 && (
                      <p className="font-mono text-[9px] text-muted tabular-nums">{formatUsd(h.usdValue)}</p>
                    )}
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="py-4 text-center text-[11px] text-muted">No results</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Swap Interface ────────────────────────────────────────────────────

export function SwapInterface({ holdings, onBack }: SwapInterfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reverseRef = useRef<HTMLButtonElement>(null);
  const [fromCurrency, setFromCurrency] = useState("BTC");
  const [toCurrency, setToCurrency] = useState("ETH");
  const [fromAmount, setFromAmount] = useState("");
  const [isReversing, setIsReversing] = useState(false);

  useGSAP(() => {
    if (!containerRef.current) return;
    const els = containerRef.current.querySelectorAll("[data-animate]");
    gsap.fromTo(containerRef.current,
      { opacity: 0, y: 20, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out" }
    );
    gsap.fromTo(els,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, delay: 0.15, ease: "power2.out" }
    );
  }, { scope: containerRef });

  const fromAsset = holdings.find((h) => h.currency === fromCurrency);
  const toAsset = holdings.find((h) => h.currency === toCurrency);

  const fromPrice = fromAsset?.price ?? 0;
  const toPrice = toAsset?.price ?? 0;
  const rate = getExchangeRate(fromPrice, toPrice);

  const parsedFrom = parseFloat(fromAmount) || 0;
  const toAmount = parsedFrom * rate;
  const fee = parsedFrom * FEE_RATE;
  const feeUsd = fee * fromPrice;
  const fromUsd = parsedFrom * fromPrice;
  const toUsd = toAmount * toPrice;

  const fromBalance = fromAsset?.amount ?? 0;
  const insufficientBalance = parsedFrom > fromBalance;
  const canSwap = parsedFrom > 0 && !insufficientBalance && fromCurrency !== toCurrency;

  function handleReverse() {
    if (isReversing) return;
    setIsReversing(true);

    if (reverseRef.current) {
      gsap.to(reverseRef.current, {
        rotate: "+=180",
        duration: 0.4,
        ease: "power2.inOut",
      });
    }

    setTimeout(() => {
      setFromCurrency(toCurrency);
      setToCurrency(fromCurrency);
      setFromAmount("");
      setIsReversing(false);
    }, 200);
  }

  function handleMax() {
    if (fromBalance > 0) {
      setFromAmount(fromBalance.toString());
    }
  }

  return (
    <div className={onBack ? "p-1 pt-0" : "flex items-start justify-center pt-4"}>
      <div
        ref={containerRef}
        className={cn(
          "w-full rounded-2xl p-5",
          onBack ? "bg-background" : "max-w-[460px] border border-border bg-background shadow-xl p-6"
        )}
      >
        {/* Header */}
        <div data-animate className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted hover:text-foreground hover:border-border-hover transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <div>
              <h1 className={cn("font-heading font-bold text-foreground", onBack ? "text-base" : "text-xl")}>Exchange</h1>
              <p className="text-[11px] text-muted">Swap your crypto instantly</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted hover:text-foreground hover:border-border-hover transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:translate-y-0">
              <Zap className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>

        {/* ── FROM ── */}
        <div
          data-animate
          className="rounded-xl border border-border bg-surface/50 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">You sell</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted tabular-nums">
                Balance: {formatCryptoAmount(fromBalance)}
              </span>
              <button
                onClick={handleMax}
                className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary hover:bg-primary/25 transition-colors"
              >
                Max
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                inputMode="decimal"
                value={fromAmount}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*\.?\d*$/.test(v)) setFromAmount(v);
                }}
                placeholder="0.00"
                className={cn("w-full bg-transparent font-mono font-bold text-foreground tabular-nums tracking-tight outline-none placeholder:text-muted/30", onBack ? "text-[22px]" : "text-[28px]")}
              />
              {parsedFrom > 0 && (
                <p className="mt-0.5 font-mono text-[11px] text-muted tabular-nums">
                  ≈{formatUsd(fromUsd)}
                </p>
              )}
            </div>
            <CryptoSelector
              selected={fromCurrency}
              holdings={holdings}
              onSelect={setFromCurrency}
              exclude={toCurrency}
            />
          </div>

          {/* Insufficient balance warning */}
          {insufficientBalance && (
            <div className="mt-2 flex items-center gap-1.5 text-error">
              <AlertCircle className="h-3 w-3" />
              <span className="text-[10px] font-medium">Insufficient balance</span>
            </div>
          )}
        </div>

        {/* ── REVERSE BUTTON ── */}
        <div data-animate className="flex justify-center -my-3 relative z-10">
          <button
            ref={reverseRef}
            onClick={handleReverse}
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-elevated text-muted transition-all duration-200 hover:scale-110 hover:text-primary hover:border-primary/30 hover:shadow-lg active:scale-95"
          >
            <ArrowDownUp className="h-4 w-4" />
          </button>
        </div>

        {/* ── TO ── */}
        <div
          data-animate
          className="rounded-xl border border-border bg-surface/50 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">You buy</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-mono font-bold tabular-nums tracking-tight",
                onBack ? "text-[22px]" : "text-[28px]",
                toAmount > 0 ? "text-foreground" : "text-muted/30"
              )}>
                {toAmount > 0 ? formatCryptoAmount(toAmount) : "0.00"}
              </p>
              {toAmount > 0 && (
                <p className="mt-0.5 font-mono text-[11px] text-muted tabular-nums">
                  ≈{formatUsd(toUsd)}
                </p>
              )}
            </div>
            <CryptoSelector
              selected={toCurrency}
              holdings={holdings}
              onSelect={setToCurrency}
              exclude={fromCurrency}
            />
          </div>
        </div>

        {/* ── Details ── */}
        <div data-animate className="mt-4 space-y-1.5">
          {/* Exchange rate */}
          {rate > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <RefreshCw className="h-3 w-3 text-muted" />
                <span className="text-[11px] text-muted">Rate</span>
              </div>
              <span className="font-mono text-[11px] font-medium text-foreground-secondary tabular-nums">
                1 {fromCurrency} = {rate >= 1 ? rate.toFixed(4) : rate.toFixed(8)} {toCurrency}
              </span>
            </div>
          )}

          {/* Fee */}
          {parsedFrom > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                <span className="text-[11px] text-muted">Fee ({(FEE_RATE * 100).toFixed(1)}%)</span>
              </div>
              <span className="font-mono text-[11px] font-medium text-foreground-secondary tabular-nums">
                {formatCryptoAmount(fee)} {fromCurrency}
                <span className="text-muted"> (~{formatUsd(feeUsd)})</span>
              </span>
            </div>
          )}
        </div>

        {/* ── Swap Button ── */}
        <div data-animate className="mt-6">
          <button
            disabled={!canSwap}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-semibold transition-all duration-200",
              canSwap
                ? "bg-primary text-white hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.99]"
                : "cursor-not-allowed border border-border bg-surface text-muted"
            )}
            style={canSwap ? {
              boxShadow: "0 4px 20px rgba(255,102,0,0.3), 0 0 40px rgba(255,102,0,0.08)",
            } : undefined}
          >
            <ArrowDownUp className="h-4 w-4" />
            Swap
          </button>
        </div>
      </div>
    </div>
  );
}
