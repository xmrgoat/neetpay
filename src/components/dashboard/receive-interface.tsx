"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CRYPTO_COLORS } from "@/lib/constants";
import {
  ArrowLeft,
  Copy,
  CheckCheck,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CryptoIcon } from "@/components/icons/crypto-icons";
import {
  CryptoSelector,
  PanelTabBar,
  CRYPTO_NAMES,
  type CryptoHolding,
  type PanelType,
} from "./crypto-selector";

// ─── Chain labels ───────────────────────────────────────────────────────────

const CHAIN_LABELS: Record<string, string> = {
  BTC: "Bitcoin Network",
  ETH: "Ethereum (ERC-20)",
  SOL: "Solana Network",
  XMR: "Monero Network",
  USDT: "Tron (TRC-20)",
  USDC: "Ethereum (ERC-20)",
  TRX: "Tron Network",
  BNB: "BNB Smart Chain",
  LTC: "Litecoin Network",
  DOGE: "Dogecoin Network",
  MATIC: "Polygon Network",
  ARB: "Arbitrum Network",
  OP: "Optimism Network",
  AVAX: "Avalanche C-Chain",
};

// ─── QR grid generator ──────────────────────────────────────────────────────

function generateQrGrid(address: string, size: number = 15): boolean[][] {
  const cells: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    cells[r] = [];
    for (let c = 0; c < size; c++) {
      const isCornerMarker =
        (r < 3 && c < 3) || (r < 3 && c >= size - 3) || (r >= size - 3 && c < 3);
      if (isCornerMarker) {
        const cr = r < 3 ? r : r - (size - 3);
        const cc = c < 3 ? c : c - (size - 3);
        cells[r][c] = cr === 0 || cr === 2 || cc === 0 || cc === 2 || (cr === 1 && cc === 1);
      } else {
        const charCode = address.charCodeAt((r * size + c) % address.length);
        cells[r][c] = (charCode + r + c) % 3 !== 0;
      }
    }
  }
  return cells;
}

// ─── Receive Interface ──────────────────────────────────────────────────────

interface ReceiveInterfaceProps {
  holdings: CryptoHolding[];
  onBack?: () => void;
  activePanel?: PanelType;
  onSwitchPanel?: (panel: PanelType) => void;
}

export function ReceiveInterface({ holdings, onBack, activePanel, onSwitchPanel }: ReceiveInterfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedCurrency, setSelectedCurrency] = useState("BTC");
  const [copied, setCopied] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // ── Fetch deposit address from API ──────────────────────────────────────
  const fetchAddress = useCallback(async (currency: string) => {
    setLoading(true);
    setError(null);
    setAddress(null);
    try {
      const res = await fetch("/api/dashboard/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currencyKey: currency }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to get deposit address");
      }
      const data = await res.json();
      setAddress(data.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get address");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddress(selectedCurrency);
  }, [selectedCurrency, fetchAddress]);

  const chain = CHAIN_LABELS[selectedCurrency] ?? "Unknown Network";
  const color = CRYPTO_COLORS[selectedCurrency] ?? "#737373";
  const name = CRYPTO_NAMES[selectedCurrency] ?? selectedCurrency;
  const qrGrid = address ? generateQrGrid(address) : null;

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  function handleCurrencyChange(c: string) {
    setSelectedCurrency(c);
    setCopied(false);
  }

  return (
    <div className={onBack ? "p-1 pt-0" : "flex items-start justify-center pt-4"}>
      <div
        ref={containerRef}
        className={cn(
          "w-full rounded-2xl p-5",
          onBack ? "bg-background" : "max-w-[min(460px,calc(100vw-1rem))] border border-border bg-background shadow-xl p-6"
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
              <h1 className="font-heading text-xl font-bold text-foreground">Receive</h1>
              <p className="text-[11px] text-muted">Receive crypto to your wallet</p>
            </div>
          </div>
        )}

        {/* ── Currency selector ── */}
        <div data-animate className="rounded-xl border border-border bg-surface/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Select currency</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: color, boxShadow: `0 2px 10px ${color}40` }}
              >
                <CryptoIcon symbol={selectedCurrency} size={36} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-foreground">{name}</p>
                <p className="text-[10px] text-muted">{chain}</p>
              </div>
            </div>
            <CryptoSelector
              selected={selectedCurrency}
              holdings={holdings}
              onSelect={handleCurrencyChange}
            />
          </div>
        </div>

        {/* ── QR Code ── */}
        <div data-animate className="mt-3 rounded-xl border border-border bg-surface/50 p-4 flex flex-col items-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-6 w-6 text-muted animate-spin" />
              <p className="text-[11px] text-muted">Generating address...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <AlertTriangle className="h-5 w-5 text-error" />
              <p className="text-[11px] text-error text-center">{error}</p>
              <button
                onClick={() => fetchAddress(selectedCurrency)}
                className="mt-1 text-[11px] text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          ) : qrGrid ? (
            <>
              <div className="rounded-xl bg-white p-3">
                <svg viewBox={`0 0 ${qrGrid.length} ${qrGrid.length}`} width="160" height="160">
                  {qrGrid.map((row, r) =>
                    row.map((filled, c) =>
                      filled ? (
                        <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#000" />
                      ) : null
                    )
                  )}
                </svg>
              </div>
              <p className="mt-2 text-[10px] text-muted">Scan to receive {selectedCurrency}</p>
            </>
          ) : null}
        </div>

        {/* ── Deposit address ── */}
        <div data-animate className="mt-3 rounded-xl border border-border bg-surface/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Deposit address</span>
          </div>
          {address ? (
            <p className="font-mono text-[12px] text-foreground break-all select-all leading-relaxed">
              {address}
            </p>
          ) : !loading && !error ? (
            <p className="font-mono text-[12px] text-muted">—</p>
          ) : null}
        </div>

        {/* ── Warning ── */}
        <div data-animate className="mt-3 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning mt-0.5" />
            <p className="text-[10px] text-muted leading-relaxed">
              Only send <span className="font-semibold text-foreground-secondary">{selectedCurrency}</span> on the <span className="font-semibold text-foreground-secondary">{chain}</span>. Sending other assets may result in permanent loss.
            </p>
          </div>
        </div>

        {/* ── Copy Button ── */}
        <div data-animate className="mt-5">
          <button
            onClick={copyAddress}
            disabled={!address}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-semibold transition-all duration-200",
              !address
                ? "cursor-not-allowed border border-border bg-surface text-muted"
                : copied
                  ? "bg-success/20 text-success border border-success/30"
                  : "bg-primary text-white hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.99]"
            )}
            style={address && !copied ? {
              boxShadow: "0 4px 20px rgba(255,102,0,0.3), 0 0 40px rgba(255,102,0,0.08)",
            } : undefined}
          >
            {copied ? (
              <>
                <CheckCheck className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Address
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
