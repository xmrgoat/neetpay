"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CRYPTO_COLORS } from "@/lib/constants";
import {
  ArrowLeft,
  ArrowUpRight,
  AlertCircle,
  Clipboard,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CryptoSelector,
  PanelTabBar,
  AmountModeToggle,
  CRYPTO_NAMES,
  CRYPTO_ICONS,
  formatCryptoAmount,
  formatFiat,
  FIAT_SIGN,
  USD_TO_FIAT,
  type CryptoHolding,
  type PanelType,
} from "./crypto-selector";

// ─── Constants ──────────────────────────────────────────────────────────────

const NETWORK_FEES: Record<string, { fee: number; currency: string }> = {
  BTC: { fee: 0.00005, currency: "BTC" },
  ETH: { fee: 0.002, currency: "ETH" },
  SOL: { fee: 0.00025, currency: "SOL" },
  XMR: { fee: 0.0001, currency: "XMR" },
  USDT: { fee: 1.0, currency: "USDT" },
  USDC: { fee: 1.0, currency: "USDC" },
  TRX: { fee: 1.0, currency: "TRX" },
  BNB: { fee: 0.0005, currency: "BNB" },
  LTC: { fee: 0.001, currency: "LTC" },
  DOGE: { fee: 2.0, currency: "DOGE" },
  TON: { fee: 0.01, currency: "TON" },
  XRP: { fee: 0.01, currency: "XRP" },
};

// ─── Send Interface ─────────────────────────────────────────────────────────

interface SendInterfaceProps {
  holdings: CryptoHolding[];
  onBack?: () => void;
  activePanel?: PanelType;
  onSwitchPanel?: (panel: PanelType) => void;
}

export function SendInterface({ holdings, onBack, activePanel, onSwitchPanel }: SendInterfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedCurrency, setSelectedCurrency] = useState("BTC");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
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

  const asset = holdings.find((h) => h.currency === selectedCurrency);
  const balance = asset?.amount ?? 0;
  const price = asset?.price ?? 0;
  const rawInput = parseFloat(amount) || 0;
  const fiatPrice = price * USD_TO_FIAT;
  const parsedAmount = inputInFiat ? (fiatPrice > 0 ? rawInput / fiatPrice : 0) : rawInput;
  const insufficientBalance = parsedAmount > balance;

  const networkFee = NETWORK_FEES[selectedCurrency] ?? { fee: 0, currency: selectedCurrency };
  const feeUsd = networkFee.fee * price;
  const totalAmount = parsedAmount + networkFee.fee;

  const canSend = parsedAmount > 0 && !insufficientBalance && address.trim().length > 10;

  function handleMax() {
    if (balance > 0) {
      const maxAmount = Math.max(0, balance - networkFee.fee);
      setAmount(inputInFiat ? (maxAmount * fiatPrice).toFixed(2) : maxAmount.toString());
    }
  }

  function toggleInputMode() {
    const val = parseFloat(amount) || 0;
    if (val > 0 && fiatPrice > 0) {
      setAmount(inputInFiat ? (val / fiatPrice).toFixed(8).replace(/\.?0+$/, "") : (val * fiatPrice).toFixed(2));
    }
    setInputInFiat(!inputInFiat);
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      setAddress(text.trim());
    } catch { /* ignore */ }
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
              <h1 className="font-heading text-xl font-bold text-foreground">Send</h1>
              <p className="text-[11px] text-muted">Send crypto to any address</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted hover:text-foreground hover:border-border-hover transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:translate-y-0">
              <Zap className="h-3.5 w-3.5" />
            </div>
          </div>
        )}

        {/* ── Amount ── */}
        <div data-animate className="rounded-xl border border-border bg-surface/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">You send</span>
              <AmountModeToggle inFiat={inputInFiat} crypto={selectedCurrency} onToggle={toggleInputMode} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted tabular-nums">
                Balance: {formatCryptoAmount(balance)}
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
                  value={amount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d*$/.test(v)) setAmount(v);
                  }}
                  placeholder="0.00"
                  className={cn("w-full bg-transparent font-mono font-bold text-foreground tabular-nums tracking-tight outline-none placeholder:text-muted/30", onBack ? "text-[22px]" : "text-[28px]")}
                />
              </div>
              {rawInput > 0 && (
                <p className="mt-0.5 font-mono text-[11px] text-muted tabular-nums">
                  ≈{inputInFiat ? `${formatCryptoAmount(parsedAmount)} ${selectedCurrency}` : formatFiat(rawInput * price)}
                </p>
              )}
            </div>
            <CryptoSelector
              selected={selectedCurrency}
              holdings={holdings}
              onSelect={setSelectedCurrency}
            />
          </div>

          {insufficientBalance && (
            <div className="mt-2 flex items-center gap-1.5 text-error">
              <AlertCircle className="h-3 w-3" />
              <span className="text-[10px] font-medium">Insufficient balance</span>
            </div>
          )}
        </div>

        {/* ── Destination Address ── */}
        <div data-animate className="mt-3 rounded-xl border border-border bg-surface/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Recipient address</span>
            <button
              onClick={handlePaste}
              className="flex items-center gap-1 rounded-md bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary hover:bg-primary/25 transition-colors"
            >
              <Clipboard className="h-2.5 w-2.5" />
              Paste
            </button>
          </div>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter wallet address"
            className="w-full bg-transparent font-mono text-[13px] text-foreground placeholder:text-muted/30 outline-none"
          />
        </div>

        {/* ── Fee Details ── */}
        <div data-animate className="mt-4 space-y-1.5">
          {/* Network fee */}
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" />
              <span className="text-[11px] text-muted">Network fee</span>
            </div>
            <span className="font-mono text-[11px] font-medium text-foreground-secondary tabular-nums">
              {formatCryptoAmount(networkFee.fee)} {selectedCurrency}
              <span className="text-muted"> (~{formatFiat(feeUsd)})</span>
            </span>
          </div>

          {/* Total */}
          {parsedAmount > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-surface/30 px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-[11px] text-muted">Total</span>
              </div>
              <span className="font-mono text-[11px] font-medium text-foreground-secondary tabular-nums">
                {formatCryptoAmount(totalAmount)} {selectedCurrency}
              </span>
            </div>
          )}
        </div>

        {/* ── Send Button ── */}
        <div data-animate className="mt-6">
          <button
            disabled={!canSend}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-semibold transition-all duration-200",
              canSend
                ? "bg-primary text-white hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.99]"
                : "cursor-not-allowed border border-border bg-surface text-muted"
            )}
            style={canSend ? {
              boxShadow: "0 4px 20px rgba(255,102,0,0.3), 0 0 40px rgba(255,102,0,0.08)",
            } : undefined}
          >
            <ArrowUpRight className="h-4 w-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
