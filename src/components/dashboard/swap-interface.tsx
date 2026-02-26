"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ArrowDownUp,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CryptoSelector,
  PanelTabBar,
  AmountModeToggle,
  formatCryptoAmount,
  formatFiat,
  FIAT_SIGN,
  USD_TO_FIAT,
  type CryptoHolding,
  type PanelType,
} from "./crypto-selector";

// ─── Constants ──────────────────────────────────────────────────────────────

const FEE_RATE = 0.005; // 0.5%

interface SwapInterfaceProps {
  holdings: CryptoHolding[];
  onBack?: () => void;
  activePanel?: PanelType;
  onSwitchPanel?: (panel: PanelType) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getExchangeRate(fromPrice: number, toPrice: number): number {
  if (toPrice === 0) return 0;
  return fromPrice / toPrice;
}

// ─── Main Swap Interface ────────────────────────────────────────────────────

export function SwapInterface({ holdings, onBack, activePanel, onSwitchPanel }: SwapInterfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reverseRef = useRef<HTMLButtonElement>(null);
  const [fromCurrency, setFromCurrency] = useState("BTC");
  const [toCurrency, setToCurrency] = useState("ETH");
  const [fromAmount, setFromAmount] = useState("");
  const [isReversing, setIsReversing] = useState(false);
  const [inputInFiat, setInputInFiat] = useState(false);

  useGSAP(() => {
    if (!containerRef.current) return;
    const els = containerRef.current.querySelectorAll("[data-animate]");
    const tl = gsap.timeline({
      onComplete() {
        gsap.set([containerRef.current!, ...els], { clearProps: "transform,opacity" });
      },
    });
    tl.fromTo(containerRef.current,
      { opacity: 0, y: 20, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out" }
    );
    tl.fromTo(els,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: "power2.out" },
      0.15
    );
  }, { scope: containerRef });

  const fromAsset = holdings.find((h) => h.currency === fromCurrency);
  const toAsset = holdings.find((h) => h.currency === toCurrency);

  const fromPrice = fromAsset?.price ?? 0;
  const toPrice = toAsset?.price ?? 0;
  const rate = getExchangeRate(fromPrice, toPrice);

  const rawInput = parseFloat(fromAmount) || 0;
  const fiatPrice = fromPrice * USD_TO_FIAT;
  const parsedFrom = inputInFiat ? (fiatPrice > 0 ? rawInput / fiatPrice : 0) : rawInput;
  const toAmount = parsedFrom * rate;
  const fee = parsedFrom * FEE_RATE;
  const feeUsd = fee * fromPrice;
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
      setFromAmount(inputInFiat ? (fromBalance * fiatPrice).toFixed(2) : fromBalance.toString());
    }
  }

  function toggleInputMode() {
    const val = parseFloat(fromAmount) || 0;
    if (val > 0 && fiatPrice > 0) {
      setFromAmount(inputInFiat ? (val / fiatPrice).toFixed(8).replace(/\.?0+$/, "") : (val * fiatPrice).toFixed(2));
    }
    setInputInFiat(!inputInFiat);
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
        {/* Tab Bar */}
        {onBack && activePanel && onSwitchPanel && (
          <div data-animate className="flex items-stretch gap-2 mb-4">
            <button
              onClick={onBack}
              className="flex w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted hover:text-foreground hover:border-border-hover transition-all duration-200 active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex-1">
              <PanelTabBar active={activePanel} onSwitch={onSwitchPanel} />
            </div>
          </div>
        )}

        {/* Header (standalone mode) */}
        {!onBack && (
          <div data-animate className="flex items-center justify-between mb-5">
            <div>
              <h1 className="font-heading text-xl font-bold text-foreground">Exchange</h1>
              <p className="text-[11px] text-muted">Swap your crypto instantly</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted hover:text-foreground hover:border-border-hover transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:translate-y-0">
              <Zap className="h-3.5 w-3.5" />
            </div>
          </div>
        )}

        {/* ── FROM ── */}
        <div
          data-animate
          className="rounded-xl border border-border bg-surface/50 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">You sell</span>
              <AmountModeToggle inFiat={inputInFiat} crypto={fromCurrency} onToggle={toggleInputMode} />
            </div>
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
              <div className="flex items-baseline gap-1">
                {inputInFiat && (
                  <span className={cn("font-mono font-bold text-muted/50 shrink-0", onBack ? "text-[22px]" : "text-[28px]")}>{FIAT_SIGN}</span>
                )}
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
              </div>
              {rawInput > 0 && (
                <p className="mt-0.5 font-mono text-[11px] text-muted tabular-nums">
                  ≈{inputInFiat ? `${formatCryptoAmount(parsedFrom)} ${fromCurrency}` : formatFiat(rawInput * fromPrice)}
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
                  ≈{formatFiat(toUsd)}
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
                <span className="text-muted"> (~{formatFiat(feeUsd)})</span>
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
