"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { ArrowRight, X, Copy, Check } from "lucide-react";
import { CRYPTO_COLORS } from "@/lib/constants";
import type { PaymentStatus } from "@/lib/constants";
import { CryptoIcon } from "@/components/icons/crypto-icons";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  amount: number;
  cryptoAmount: number;
  status: PaymentStatus;
  trackId: string;
  payCurrency: string;
  txHash: string;
  address: string;
  createdAt: Date;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const CRYPTO_ICONS: Record<string, string> = {
  BTC: "₿", ETH: "Ξ", SOL: "◎", XMR: "ɱ",
  USDT: "₮", USDC: "$", TRX: "◈", BNB: "◆",
  LTC: "Ł", DOGE: "Ð", TON: "◇", XRP: "✕",
  AVAX: "▲", ARB: "◬", OP: "⬡", MATIC: "◈",
};

const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pending", confirming: "Confirming", paid: "Paid",
  expired: "Expired", failed: "Failed", underpaid: "Underpaid", refunded: "Refunded",
};

const STATUS_STYLE: Record<PaymentStatus, string> = {
  paid: "bg-success/15 text-success",
  confirming: "bg-primary/15 text-primary",
  pending: "bg-warning/15 text-warning",
  expired: "bg-surface text-muted",
  failed: "bg-error/15 text-error",
  underpaid: "bg-warning/15 text-warning",
  refunded: "bg-surface text-muted",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) + ", " + date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// ─── Detail Modal ───────────────────────────────────────────────────────────

function DetailModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useGSAP(() => {
    if (!overlayRef.current || !panelRef.current) return;
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    gsap.fromTo(
      panelRef.current,
      { opacity: 0, y: 16, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: "power3.out" },
    );
  }, { scope: overlayRef });

  function handleClose() {
    if (!overlayRef.current || !panelRef.current) { onClose(); return; }
    const tl = gsap.timeline({ onComplete: onClose });
    tl.to(panelRef.current, { opacity: 0, y: 10, scale: 0.97, duration: 0.15, ease: "power2.in" });
    tl.to(overlayRef.current, { opacity: 0, duration: 0.15 }, "<");
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const color = CRYPTO_COLORS[tx.payCurrency] ?? "#737373";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        ref={panelRef}
        className="relative w-full max-w-sm rounded-2xl border border-border bg-background shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-foreground">Detail</h3>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Track ID */}
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted mb-2">Info</p>
            <div className="rounded-xl bg-surface/60 px-4 py-3">
              <p className="text-[11px] text-muted mb-0.5">Track ID</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-xs font-medium text-primary break-all">{tx.trackId}</p>
                <button onClick={() => copyText(tx.trackId, "track")} className="shrink-0 text-muted hover:text-foreground transition-colors">
                  {copied === "track" ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Transaction info */}
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted mb-2">Transaction</p>
            <div className="rounded-xl bg-surface/60 divide-y divide-border/50">
              {/* Amount */}
              <div className="px-4 py-3">
                <p className="text-[11px] text-muted mb-0.5">Amount</p>
                <p className="font-mono text-xs font-medium" style={{ color }}>
                  {tx.cryptoAmount} {tx.payCurrency}
                </p>
              </div>

              {/* Tx Hash */}
              <div className="px-4 py-3">
                <p className="text-[11px] text-muted mb-0.5">Transaction Hash</p>
                <div className="flex items-start gap-2">
                  <p className="font-mono text-[11px] font-medium text-primary break-all leading-relaxed">{tx.txHash}</p>
                  <button onClick={() => copyText(tx.txHash, "hash")} className="shrink-0 mt-0.5 text-muted hover:text-foreground transition-colors">
                    {copied === "hash" ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {/* Address */}
              <div className="px-4 py-3">
                <p className="text-[11px] text-muted mb-0.5">Destination Address</p>
                <div className="flex items-start gap-2">
                  <p className="font-mono text-[11px] font-medium text-primary break-all leading-relaxed">{tx.address}</p>
                  <button onClick={() => copyText(tx.address, "addr")} className="shrink-0 mt-0.5 text-muted hover:text-foreground transition-colors">
                    {copied === "addr" ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {/* Date */}
              <div className="px-4 py-3">
                <p className="text-[11px] text-muted mb-0.5">Date & Time</p>
                <p className="font-mono text-xs font-medium text-primary">{formatDate(tx.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      const rows = containerRef.current.querySelectorAll("[data-row]");
      if (!rows.length) return;
      gsap.fromTo(
        rows,
        { opacity: 0, y: 6 },
        {
          opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: "power2.out",
          onComplete() { gsap.set(rows, { clearProps: "transform,opacity" }); },
        },
      );
    },
    { scope: containerRef },
  );

  return (
    <>
      <div ref={containerRef} className="rounded-xl border border-border bg-background">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-medium text-foreground">Recent Transactions</h2>
          <Link href="/dashboard/payments" className="flex items-center gap-1 text-[11px] text-muted hover:text-foreground transition-colors">
            See All <ArrowRight size={11} />
          </Link>
        </div>

        {/* Table header */}
        <div className="hidden sm:flex items-center border-b border-border/50 px-5 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted">
          <span className="w-[72px]">Type</span>
          <span className="flex-1">Currency & Amount</span>
          <span className="w-[88px] text-center">Status</span>
          <span className="w-[148px] text-right">Date & Time</span>
          <span className="w-[52px] text-right">Detail</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/50">
          {transactions.map((tx) => {
            const color = CRYPTO_COLORS[tx.payCurrency] ?? "#737373";
            const _icon = tx.payCurrency;
            return (
              <div
                key={tx.id}
                data-row
                className="flex items-center px-5 py-3 transition-colors hover:bg-surface/40"
              >
                {/* Type badge */}
                <div className="w-[72px] shrink-0">
                  <span className="inline-flex items-center rounded-md bg-surface px-2 py-1 text-[10px] font-semibold text-foreground-secondary">
                    Payment
                  </span>
                </div>

                {/* Currency icon + crypto amount */}
                <div className="flex flex-1 items-center gap-3 min-w-0">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: color }}
                  >
                    <CryptoIcon symbol={tx.payCurrency} size={28} />
                  </div>
                  <span className="text-sm font-medium text-foreground tabular-nums truncate">
                    {tx.cryptoAmount} {tx.payCurrency}
                  </span>
                </div>

                {/* Status */}
                <div className="w-[88px] shrink-0 flex justify-center">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${STATUS_STYLE[tx.status] ?? "bg-surface text-muted"}`}>
                    {STATUS_LABEL[tx.status] ?? tx.status}
                  </span>
                </div>

                {/* Date & Time */}
                <span className="hidden sm:block w-[148px] shrink-0 text-right text-[11px] text-muted tabular-nums">
                  {formatDate(tx.createdAt)}
                </span>

                {/* Detail link */}
                <div className="w-[52px] shrink-0 text-right">
                  <button
                    onClick={() => setSelectedTx(tx)}
                    className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Detail
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail modal */}
      {selectedTx && (
        <DetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </>
  );
}
