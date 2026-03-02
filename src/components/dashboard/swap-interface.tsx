"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ArrowDownUp,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Loader2,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Settings2,
  Route,
  ChevronDown,
  ChevronUp,
  Fuel,
  Shield,
  Info,
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

type SwapProviderName = "thorchain" | "oneinch" | "sideshift";

interface QuoteResponse {
  provider: SwapProviderName;
  quoteId: string;
  rate: string;
  depositAmount: string;
  settleAmount: string;
  expiresAt: string;
  min: string | null;
  max: string | null;
  fees?: { network: string; protocol: string; affiliate?: string };
}

interface SwapResponse {
  swapId: string;
  provider: SwapProviderName;
  depositAddress: string;
  depositMemo?: string;
  depositAmount: string;
  settleAmount: string;
  rate: string;
  status: string;
  expiresAt: string;
}

interface StatusResponse {
  swapId: string;
  provider: SwapProviderName;
  status: string;
  settleHash?: string;
  settleAmount: string;
}

const PROVIDER_LABELS: Record<SwapProviderName, string> = {
  thorchain: "THORChain",
  oneinch: "1inch Fusion",
  sideshift: "SideShift.ai",
};

const PROVIDER_TYPES: Record<SwapProviderName, string> = {
  thorchain: "Cross-chain DEX",
  oneinch: "EVM DEX Aggregator",
  sideshift: "Instant Exchange",
};

const SLIPPAGE_PRESETS = [0.5, 1, 3];

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

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [slippage, setSlippage] = useState(1);
  const [customSlippage, setCustomSlippage] = useState("");

  // Details panel
  const [showDetails, setShowDetails] = useState(false);

  // Quote state
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [lastQuoteTime, setLastQuoteTime] = useState<number>(0);

  // Swap execution state
  const [step, setStep] = useState<SwapStep>("input");
  const [swap, setSwap] = useState<SwapResponse | null>(null);
  const [swapStatus, setSwapStatus] = useState<StatusResponse | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Countdown
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const expiredRef = useRef(false);

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

  const quoteRate = quote ? parseFloat(quote.rate) : 0;
  const quoteSettle = quote?.settleAmount ? parseFloat(quote.settleAmount) : 0;
  const fallbackRate = toPrice > 0 ? fromPrice / toPrice : 0;
  const displayRate = quoteRate > 0 ? quoteRate : fallbackRate;
  const toAmount = quoteSettle > 0 ? quoteSettle : parsedFrom * fallbackRate;
  const toUsd = toAmount * toPrice;
  const fromUsd = parsedFrom * fromPrice;

  // Price impact calculation
  const marketRate = fallbackRate;
  const priceImpact = marketRate > 0 && quoteRate > 0
    ? Math.abs(((quoteRate - marketRate) / marketRate) * 100)
    : 0;

  // Min/max from quote
  const minDeposit = quote?.min ? parseFloat(quote.min) : 0;
  const maxDeposit = quote?.max ? parseFloat(quote.max) : 0;
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

  // Button label
  const getButtonLabel = () => {
    if (quoteLoading) return "Finding best rate...";
    if (!fromAmount || parsedFrom === 0) return "Enter amount";
    if (fromCurrency === toCurrency) return "Select different tokens";
    if (insufficientBalance) return "Insufficient balance";
    if (belowMin) return `Min ${formatCryptoAmount(minDeposit)} ${fromCurrency}`;
    if (aboveMax) return `Max ${formatCryptoAmount(maxDeposit)} ${fromCurrency}`;
    if (!quote) return "Getting quote...";
    return "Swap";
  };

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
      setLastQuoteTime(Date.now());
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : "Quote failed");
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  }, []);

  // Auto-refresh quote every 15s
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

  useEffect(() => {
    if (!quote || parsedFrom <= 0 || step !== "input") return;
    const interval = setInterval(() => {
      fetchQuote(fromCurrency, toCurrency, parsedFrom.toString());
    }, 15000);
    return () => clearInterval(interval);
  }, [quote, parsedFrom, fromCurrency, toCurrency, step, fetchQuote]);

  // ── Countdown timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== "depositing" || !swap?.expiresAt) return;
    expiredRef.current = false;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(swap.expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        expiredRef.current = true;
        setStep("error");
        setSwapError("Swap expired");
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [step, swap?.expiresAt]);

  // ── Poll swap status ────────────────────────────────────────────────────
  useEffect(() => {
    if ((step !== "depositing" && step !== "processing") || !swap?.swapId) return;
    const poll = setInterval(async () => {
      if (expiredRef.current) return;
      try {
        const res = await fetch(`/api/dashboard/swap/status?swapId=${swap.swapId}&provider=${swap.provider}`);
        if (!res.ok) return;
        const data: StatusResponse = await res.json();
        if (expiredRef.current) return;
        setSwapStatus(data);
        if (data.status === "deposited" || data.status === "processing") {
          setStep("processing");
        } else if (data.status === "complete") {
          setStep("complete");
          clearInterval(poll);
        } else if (data.status === "refunded" || data.status === "expired" || data.status === "failed") {
          setStep("error");
          setSwapError(`Swap ${data.status}`);
          clearInterval(poll);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(poll);
  }, [step, swap?.swapId, swap?.provider]);

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

  function handleHalf() {
    if (fromBalance > 0) {
      const half = fromBalance / 2;
      setFromAmount(inputInFiat ? (half * fiatPrice).toFixed(2) : half.toString());
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
      const res = await fetch("/api/dashboard/swap/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.quoteId,
          settleAddress: "self",
          toCurrency,
          provider: quote.provider,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Swap execution failed");
      }

      const data: SwapResponse = await res.json();
      setSwap(data);
      setStep("depositing");
    } catch (err) {
      setSwapError(err instanceof Error ? err.message : "Swap failed");
      setStep("error");
    }
  }

  function resetSwap() {
    expiredRef.current = false;
    setStep("input");
    setSwap(null);
    setSwapStatus(null);
    setSwapError(null);
    setQuote(null);
    setFromAmount("");
  }

  async function copyAddress(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const activeSlippage = customSlippage ? parseFloat(customSlippage) : slippage;

  // ── Status views (depositing / processing / complete / error) ──────────

  if (step !== "input") {
    return (
      <div className={onBack ? "p-1 pt-0" : "flex items-start justify-center pt-4"}>
        <div
          ref={containerRef}
          className={cn(
            "w-full rounded-2xl",
            onBack ? "bg-background p-5" : "max-w-[min(460px,calc(100vw-1rem))] border border-border bg-background shadow-xl p-6"
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
              <p className="text-sm text-muted">Creating swap...</p>
            </div>
          )}

          {/* Depositing */}
          {step === "depositing" && swap && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">Send exactly</p>
                <p className="font-mono text-2xl font-bold text-foreground">
                  {swap.depositAmount} {fromCurrency}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">To this address</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate font-mono text-xs text-foreground-secondary">
                    {swap.depositAddress}
                  </code>
                  <button
                    onClick={() => copyAddress(swap.depositAddress)}
                    className="shrink-0 rounded-lg border border-border bg-surface p-2 text-muted hover:text-foreground transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {swap.depositMemo && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">Memo (required)</p>
                    <code className="font-mono text-xs text-warning">{swap.depositMemo}</code>
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
                  ~{swap.settleAmount} {toCurrency}
                </span>
              </div>
            </div>
          )}

          {/* Processing */}
          {step === "processing" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="relative">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-primary/20" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Processing swap</p>
                <p className="text-[11px] text-muted mt-1">
                  Deposit received, settling {toCurrency}...
                </p>
              </div>
              {/* Progress steps */}
              <div className="flex items-center gap-2 mt-2">
                <StepDot active done label="Deposited" />
                <div className="h-px w-8 bg-primary" />
                <StepDot active done={false} label="Confirming" />
                <div className="h-px w-8 bg-border" />
                <StepDot active={false} done={false} label="Complete" />
              </div>
            </div>
          )}

          {/* Complete */}
          {step === "complete" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
                <Check className="h-7 w-7 text-success" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Swap complete</p>
                <p className="font-mono text-xl font-bold text-foreground mt-1">
                  +{swapStatus?.settleAmount ?? swap?.settleAmount} {toCurrency}
                </p>
              </div>
              {swapStatus?.settleHash && (
                <a
                  href="#"
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
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error/15">
                <AlertCircle className="h-7 w-7 text-error" />
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
          "w-full rounded-2xl",
          onBack ? "bg-background p-5" : "max-w-[min(460px,calc(100vw-1rem))] border border-border bg-background shadow-xl p-6"
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

        {/* Header */}
        {!onBack && (
          <div data-animate className="flex items-center justify-between mb-5">
            <div>
              <h1 className="font-heading text-xl font-bold text-foreground">Swap</h1>
              <p className="text-[11px] text-muted">
                {quote ? `via ${PROVIDER_LABELS[quote.provider]}` : "Best rate across DEXs"}
              </p>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer",
                showSettings
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-surface text-muted hover:text-foreground hover:border-border-hover"
              )}
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div data-animate className="mb-4 rounded-xl border border-border bg-surface/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-muted" />
                <span className="text-[12px] font-medium text-foreground">Slippage Tolerance</span>
              </div>
              <span className="font-mono text-[11px] text-primary font-medium">{activeSlippage}%</span>
            </div>
            <div className="flex items-center gap-2">
              {SLIPPAGE_PRESETS.map((val) => (
                <button
                  key={val}
                  onClick={() => { setSlippage(val); setCustomSlippage(""); }}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-[12px] font-medium transition-all duration-200",
                    slippage === val && !customSlippage
                      ? "bg-primary text-white"
                      : "border border-border bg-background text-muted hover:text-foreground"
                  )}
                >
                  {val}%
                </button>
              ))}
              <div className="flex flex-1 items-center rounded-lg border border-border bg-background px-2 py-1.5">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Custom"
                  value={customSlippage}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d*$/.test(v)) setCustomSlippage(v);
                  }}
                  className="w-full bg-transparent text-[12px] font-medium text-foreground outline-none placeholder:text-muted tabular-nums"
                />
                <span className="text-[10px] text-muted ml-0.5">%</span>
              </div>
            </div>
            {activeSlippage > 5 && (
              <div className="flex items-center gap-1.5 text-warning">
                <AlertCircle className="h-3 w-3" />
                <span className="text-[10px]">High slippage. Transaction may be frontrun.</span>
              </div>
            )}
          </div>
        )}

        {/* ── FROM ── */}
        <div
          data-animate
          className="rounded-xl border border-border bg-surface/50 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">You pay</span>
              <AmountModeToggle inFiat={inputInFiat} crypto={fromCurrency} onToggle={toggleInputMode} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted tabular-nums">
                {formatCryptoAmount(fromBalance)}
              </span>
              <button
                onClick={handleHalf}
                className="rounded-md bg-surface px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted hover:text-foreground hover:bg-border/50 transition-colors"
              >
                Half
              </button>
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
                  placeholder="0"
                  className={cn("w-full bg-transparent font-mono font-bold text-foreground tabular-nums tracking-tight outline-none placeholder:text-muted/30", onBack ? "text-[22px]" : "text-[28px]")}
                />
              </div>
              {rawInput > 0 && (
                <p className="mt-0.5 font-mono text-[11px] text-muted tabular-nums">
                  {inputInFiat ? `${formatCryptoAmount(parsedFrom)} ${fromCurrency}` : `~${formatFiat(rawInput * fromPrice)}`}
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
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">You receive</span>
            {quoteLoading && <Loader2 className="h-3 w-3 text-muted animate-spin" />}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-mono font-bold tabular-nums tracking-tight",
                onBack ? "text-[22px]" : "text-[28px]",
                toAmount > 0 ? "text-foreground" : "text-muted/30"
              )}>
                {toAmount > 0 ? formatCryptoAmount(toAmount) : "0"}
              </p>
              {toAmount > 0 && (
                <p className="mt-0.5 font-mono text-[11px] text-muted tabular-nums">
                  ~{formatFiat(toUsd)}
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

        {/* ── Details (collapsible, Jupiter-style) ── */}
        {quote && parsedFrom > 0 && (
          <div data-animate className="mt-3">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-surface/30 px-3 py-2.5 transition-colors hover:bg-surface/50"
            >
              <div className="flex items-center gap-2">
                <RefreshCw className={cn("h-3 w-3 text-muted", quoteLoading && "animate-spin")} />
                <span className="font-mono text-[11px] font-medium text-foreground-secondary tabular-nums">
                  1 {fromCurrency} = {displayRate >= 1 ? displayRate.toFixed(4) : displayRate.toFixed(8)} {toCurrency}
                </span>
              </div>
              {showDetails ? <ChevronUp className="h-3 w-3 text-muted" /> : <ChevronDown className="h-3 w-3 text-muted" />}
            </button>

            {showDetails && (
              <div className="mt-1 space-y-1">
                {/* Price Impact */}
                <DetailRow
                  label="Price Impact"
                  value={
                    <span className={cn("font-mono", priceImpact > 3 ? "text-error" : priceImpact > 1 ? "text-warning" : "text-success")}>
                      {priceImpact > 0 ? `${priceImpact.toFixed(2)}%` : "<0.01%"}
                    </span>
                  }
                />

                {/* Slippage */}
                <DetailRow label="Max Slippage" value={`${activeSlippage}%`} />

                {/* Minimum received */}
                <DetailRow
                  label="Minimum Received"
                  value={`${formatCryptoAmount(toAmount * (1 - activeSlippage / 100))} ${toCurrency}`}
                />

                {/* Route */}
                <DetailRow
                  label="Route"
                  value={
                    <span className="flex items-center gap-1">
                      <Route className="h-3 w-3 text-muted" />
                      {PROVIDER_LABELS[quote.provider]}
                      <span className="text-muted">({PROVIDER_TYPES[quote.provider]})</span>
                    </span>
                  }
                />

                {/* Fees */}
                {quote.fees && (
                  <>
                    <DetailRow
                      label="Network Fee"
                      value={quote.fees.network !== "0" ? `$${quote.fees.network}` : "Included"}
                    />
                    <DetailRow
                      label="Protocol Fee"
                      value={quote.fees.protocol !== "0" ? `$${quote.fees.protocol}` : "Free"}
                    />
                  </>
                )}

                {/* Limits */}
                {minDeposit > 0 && (
                  <DetailRow
                    label="Limits"
                    value={`${formatCryptoAmount(minDeposit)}${maxDeposit > 0 ? ` – ${formatCryptoAmount(maxDeposit)}` : "+"} ${fromCurrency}`}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Quote error */}
        {quoteError && (
          <div data-animate className="mt-3 flex items-center gap-1.5 rounded-lg border border-error/30 bg-error/5 px-3 py-2.5">
            <AlertCircle className="h-3 w-3 text-error" />
            <span className="text-[10px] text-error">{quoteError}</span>
          </div>
        )}

        {/* ── Swap Button ── */}
        <div data-animate className="mt-5">
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
            ) : canSwap ? (
              <ArrowDownUp className="h-4 w-4" />
            ) : null}
            {getButtonLabel()}
          </button>
        </div>

        {/* Provider attribution */}
        <p data-animate className="mt-3 text-center text-[9px] text-muted/50">
          {quote
            ? `Powered by ${PROVIDER_LABELS[quote.provider]} \u00b7 Auto-refreshes every 15s`
            : "Smart routing across THORChain, 1inch & SideShift"}
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 px-3 py-2">
      <span className="text-[11px] text-muted">{label}</span>
      <span className="font-mono text-[11px] text-foreground-secondary">{value}</span>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn(
        "h-3 w-3 rounded-full border-2 transition-colors",
        done ? "border-primary bg-primary" : active ? "border-primary bg-transparent" : "border-border bg-transparent"
      )}>
        {done && <Check className="h-2 w-2 text-white" />}
      </div>
      <span className={cn("text-[8px]", active ? "text-foreground" : "text-muted")}>{label}</span>
    </div>
  );
}
