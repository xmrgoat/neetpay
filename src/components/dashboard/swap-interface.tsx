"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ArrowDownUp,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Zap,
  Loader2,
  Clock,
  Copy,
  Check,
  ExternalLink,
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

// ─── Types ──────────────────────────────────────────────────────────────────

interface QuoteResponse {
  quoteId: string;
  rate: string;
  depositAmount: string;
  settleAmount: string;
  expiresAt: string;
  min: string;
  max: string;
}

interface ShiftResponse {
  shiftId: string;
  depositAddress: string;
  depositMemo?: string;
  depositAmount: string;
  settleAmount: string;
  rate: string;
  status: string;
  expiresAt: string;
  averageShiftSeconds?: string;
}

interface StatusResponse {
  shiftId: string;
  status: string;
  depositReceivedAt?: string;
  settleHash?: string;
  settleAmount: string;
}

type SwapStep = "input" | "confirming" | "depositing" | "processing" | "complete" | "error";

interface SwapInterfaceProps {
  holdings: CryptoHolding[];
  onBack?: () => void;
  activePanel?: PanelType;
  onSwitchPanel?: (panel: PanelType) => void;
}

// ─── Main Swap Interface ────────────────────────────────────────────────────

export function SwapInterface({ holdings, onBack, activePanel, onSwitchPanel }: SwapInterfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reverseRef = useRef<HTMLButtonElement>(null);

  // Input state
  const [fromCurrency, setFromCurrency] = useState("BTC");
  const [toCurrency, setToCurrency] = useState("ETH");
  const [fromAmount, setFromAmount] = useState("");
  const [isReversing, setIsReversing] = useState(false);
  const [inputInFiat, setInputInFiat] = useState(false);

  // SideShift state
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Shift execution state
  const [step, setStep] = useState<SwapStep>("input");
  const [shift, setShift] = useState<ShiftResponse | null>(null);
  const [shiftStatus, setShiftStatus] = useState<StatusResponse | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Countdown
  const [timeLeft, setTimeLeft] = useState<number>(0);

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

  const rawInput = parseFloat(fromAmount) || 0;
  const fiatPrice = fromPrice * USD_TO_FIAT;
  const parsedFrom = inputInFiat ? (fiatPrice > 0 ? rawInput / fiatPrice : 0) : rawInput;

  // Use SideShift quote data when available, otherwise fallback to price ratio
  const ssRate = quote ? parseFloat(quote.rate) : 0;
  const ssSettle = quote?.settleAmount ? parseFloat(quote.settleAmount) : 0;
  const fallbackRate = toPrice > 0 ? fromPrice / toPrice : 0;
  const displayRate = ssRate > 0 ? ssRate : fallbackRate;
  const toAmount = ssSettle > 0 ? ssSettle : parsedFrom * fallbackRate;
  const toUsd = toAmount * toPrice;

  // Min/max from SideShift
  const minDeposit = quote ? parseFloat(quote.min) : 0;
  const maxDeposit = quote ? parseFloat(quote.max) : 0;
  const belowMin = minDeposit > 0 && parsedFrom > 0 && parsedFrom < minDeposit;
  const aboveMax = maxDeposit > 0 && parsedFrom > maxDeposit;

  const fromBalance = fromAsset?.amount ?? 0;
  const insufficientBalance = parsedFrom > fromBalance;
  const canSwap = parsedFrom > 0
    && !insufficientBalance
    && fromCurrency !== toCurrency
    && !belowMin
    && !aboveMax
    && !quoteLoading
    && !!quote?.quoteId;

  // ── Debounced quote fetch ─────────────────────────────────────────────────
  const fetchQuote = useCallback(async (from: string, to: string, amount: string) => {
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const res = await fetch("/api/dashboard/swap/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, amount }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Quote failed");
      }
      const data: QuoteResponse = await res.json();
      setQuote(data);
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : "Quote failed");
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  }, []);

  useEffect(() => {
    if (parsedFrom <= 0 || fromCurrency === toCurrency) {
      setQuote(null);
      return;
    }
    const timer = setTimeout(() => {
      fetchQuote(fromCurrency, toCurrency, parsedFrom.toString());
    }, 500);
    return () => clearTimeout(timer);
  }, [parsedFrom, fromCurrency, toCurrency, fetchQuote]);

  // ── Countdown timer for shift deposit ─────────────────────────────────────
  useEffect(() => {
    if (step !== "depositing" || !shift?.expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(shift.expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setStep("error");
        setSwapError("Shift expired");
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [step, shift?.expiresAt]);

  // ── Poll shift status ─────────────────────────────────────────────────────
  useEffect(() => {
    if ((step !== "depositing" && step !== "processing") || !shift?.shiftId) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/dashboard/swap/status?shiftId=${shift.shiftId}`);
        if (!res.ok) return;
        const data: StatusResponse = await res.json();
        setShiftStatus(data);

        if (data.status === "settling" || data.status === "review") {
          setStep("processing");
        } else if (data.status === "settled") {
          setStep("complete");
          clearInterval(poll);
        } else if (data.status === "refund" || data.status === "expired") {
          setStep("error");
          setSwapError(`Shift ${data.status}`);
          clearInterval(poll);
        }
      } catch { /* ignore polling errors */ }
    }, 5000);
    return () => clearInterval(poll);
  }, [step, shift?.shiftId]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleReverse() {
    if (isReversing || step !== "input") return;
    setIsReversing(true);
    if (reverseRef.current) {
      gsap.to(reverseRef.current, { rotate: "+=180", duration: 0.4, ease: "power2.inOut" });
    }
    setTimeout(() => {
      setFromCurrency(toCurrency);
      setToCurrency(fromCurrency);
      setFromAmount("");
      setQuote(null);
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

  async function handleSwap() {
    if (!quote) return;
    setStep("confirming");
    setSwapError(null);

    try {
      // Use user's own wallet address as settle address
      // For now we pass a placeholder — the backend should resolve the user's deposit address
      const res = await fetch("/api/dashboard/swap/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.quoteId,
          settleAddress: "self", // backend resolves user's wallet address
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Shift creation failed");
      }

      const data: ShiftResponse = await res.json();
      setShift(data);
      setStep("depositing");
    } catch (err) {
      setSwapError(err instanceof Error ? err.message : "Swap failed");
      setStep("error");
    }
  }

  function resetSwap() {
    setStep("input");
    setShift(null);
    setShiftStatus(null);
    setSwapError(null);
    setQuote(null);
    setFromAmount("");
  }

  async function copyAddress(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Shift status view (depositing / processing / complete / error) ────────

  if (step !== "input") {
    return (
      <div className={onBack ? "p-1 pt-0" : "flex items-start justify-center pt-4"}>
        <div
          ref={containerRef}
          className={cn(
            "w-full rounded-2xl p-5",
            onBack ? "bg-background" : "max-w-[460px] border border-border bg-background shadow-xl p-6"
          )}
        >
          {onBack && activePanel && onSwitchPanel && (
            <div className="flex items-stretch gap-2 mb-4">
              <button
                onClick={resetSwap}
                className="flex w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted hover:text-foreground hover:border-border-hover transition-all duration-200 active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex-1">
                <PanelTabBar active={activePanel} onSwitch={onSwitchPanel} />
              </div>
            </div>
          )}

          {/* Confirming */}
          {step === "confirming" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted">Creating shift...</p>
            </div>
          )}

          {/* Depositing — show deposit address */}
          {step === "depositing" && shift && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
                  Send exactly
                </p>
                <p className="font-mono text-2xl font-bold text-foreground">
                  {shift.depositAmount} {fromCurrency}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  To this address
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate font-mono text-xs text-foreground-secondary">
                    {shift.depositAddress}
                  </code>
                  <button
                    onClick={() => copyAddress(shift.depositAddress)}
                    className="shrink-0 rounded-lg border border-border bg-surface p-2 text-muted hover:text-foreground transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {shift.depositMemo && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">Memo (required)</p>
                    <code className="font-mono text-xs text-warning">{shift.depositMemo}</code>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-muted" />
                  <span className="text-[11px] text-muted">Expires in</span>
                </div>
                <span className={cn(
                  "font-mono text-[11px] font-medium tabular-nums",
                  timeLeft < 60 ? "text-error" : "text-foreground-secondary"
                )}>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 px-3 py-2.5">
                <span className="text-[11px] text-muted">You receive</span>
                <span className="font-mono text-[11px] font-medium text-foreground-secondary">
                  ~{shift.settleAmount} {toCurrency}
                </span>
              </div>
            </div>
          )}

          {/* Processing */}
          {step === "processing" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Processing swap</p>
                <p className="text-[11px] text-muted mt-1">
                  Deposit received, settling {toCurrency}...
                </p>
              </div>
            </div>
          )}

          {/* Complete */}
          {step === "complete" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
                <Check className="h-6 w-6 text-success" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Swap complete</p>
                <p className="font-mono text-lg font-bold text-foreground mt-1">
                  +{shiftStatus?.settleAmount ?? shift?.settleAmount} {toCurrency}
                </p>
              </div>
              {shiftStatus?.settleHash && (
                <a
                  href={`#`}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View transaction
                </a>
              )}
              <button
                onClick={resetSwap}
                className="mt-2 rounded-xl border border-border bg-surface px-6 py-2.5 text-[13px] font-medium text-foreground hover:bg-surface/80 transition-colors"
              >
                New swap
              </button>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/15">
                <AlertCircle className="h-6 w-6 text-error" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Swap failed</p>
                <p className="text-[11px] text-muted mt-1">{swapError}</p>
              </div>
              <button
                onClick={resetSwap}
                className="mt-2 rounded-xl border border-border bg-surface px-6 py-2.5 text-[13px] font-medium text-foreground hover:bg-surface/80 transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Input view ────────────────────────────────────────────────────────────

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
              <p className="text-[11px] text-muted">Swap via SideShift.ai</p>
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

          {/* Warnings */}
          {insufficientBalance && (
            <div className="mt-2 flex items-center gap-1.5 text-error">
              <AlertCircle className="h-3 w-3" />
              <span className="text-[10px] font-medium">Insufficient balance</span>
            </div>
          )}
          {belowMin && (
            <div className="mt-2 flex items-center gap-1.5 text-warning">
              <AlertCircle className="h-3 w-3" />
              <span className="text-[10px] font-medium">Min: {formatCryptoAmount(minDeposit)} {fromCurrency}</span>
            </div>
          )}
          {aboveMax && (
            <div className="mt-2 flex items-center gap-1.5 text-warning">
              <AlertCircle className="h-3 w-3" />
              <span className="text-[10px] font-medium">Max: {formatCryptoAmount(maxDeposit)} {fromCurrency}</span>
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
            {quoteLoading && <Loader2 className="h-3 w-3 text-muted animate-spin" />}
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
          {displayRate > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <RefreshCw className={cn("h-3 w-3 text-muted", quoteLoading && "animate-spin")} />
                <span className="text-[11px] text-muted">Rate{quote ? "" : " (est.)"}</span>
              </div>
              <span className="font-mono text-[11px] font-medium text-foreground-secondary tabular-nums">
                1 {fromCurrency} = {displayRate >= 1 ? displayRate.toFixed(4) : displayRate.toFixed(8)} {toCurrency}
              </span>
            </div>
          )}

          {quoteError && (
            <div className="flex items-center gap-1.5 rounded-lg border border-error/30 bg-error/5 px-3 py-2.5">
              <AlertCircle className="h-3 w-3 text-error" />
              <span className="text-[10px] text-error">{quoteError}</span>
            </div>
          )}

          {minDeposit > 0 && maxDeposit > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 px-3 py-2.5">
              <span className="text-[11px] text-muted">Limits</span>
              <span className="font-mono text-[11px] text-foreground-secondary tabular-nums">
                {formatCryptoAmount(minDeposit)} – {formatCryptoAmount(maxDeposit)} {fromCurrency}
              </span>
            </div>
          )}
        </div>

        {/* ── Swap Button ── */}
        <div data-animate className="mt-6">
          <button
            disabled={!canSwap}
            onClick={handleSwap}
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
            {quoteLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowDownUp className="h-4 w-4" />
            )}
            {quoteLoading ? "Getting quote..." : "Swap"}
          </button>
        </div>

        {/* SideShift attribution */}
        <p className="mt-3 text-center text-[9px] text-muted/50">
          Powered by SideShift.ai
        </p>
      </div>
    </div>
  );
}
