"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { ArrowRight, Copy, Check, X, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
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

const STATUS_CONFIG: Record<PaymentStatus, { label: string; dot: string; text: string }> = {
  paid:       { label: "Paid",       dot: "bg-success",       text: "text-success" },
  confirming: { label: "Confirming", dot: "bg-primary",       text: "text-primary" },
  pending:    { label: "Pending",    dot: "bg-warning",       text: "text-warning" },
  expired:    { label: "Expired",    dot: "bg-muted/50",      text: "text-muted" },
  failed:     { label: "Failed",     dot: "bg-error",         text: "text-error" },
  underpaid:  { label: "Underpaid",  dot: "bg-warning",       text: "text-warning" },
  refunded:   { label: "Refunded",   dot: "bg-muted/50",      text: "text-muted" },
};

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function groupByDay(txs: Transaction[]): { label: string; transactions: Transaction[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);

  const groups: Map<string, Transaction[]> = new Map();

  for (const tx of txs) {
    const txDate = new Date(tx.createdAt);
    const txDay = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());

    let label: string;
    if (txDay.getTime() === today.getTime()) {
      label = "Today";
    } else if (txDay.getTime() === yesterday.getTime()) {
      label = "Yesterday";
    } else {
      label = txDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(tx);
  }

  return Array.from(groups.entries()).map(([label, transactions]) => ({ label, transactions }));
}

// ─── Detail Overlay ─────────────────────────────────────────────────────────

function DetailOverlay({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
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
  const fields = [
    { label: "Track ID", value: tx.trackId, key: "track" },
    { label: "Tx Hash", value: tx.txHash, key: "hash" },
    { label: "Address", value: tx.address, key: "addr" },
  ].filter((f) => f.value);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div ref={panelRef} className="relative w-full max-w-sm rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: color }}
            >
              <CryptoIcon symbol={tx.payCurrency} size={28} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground tabular-nums">
                {tx.cryptoAmount} {tx.payCurrency}
              </p>
              <p className="text-[11px] text-muted">${tx.amount.toFixed(2)} USD</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-2">
          {fields.map((f) => (
            <div key={f.key} className="rounded-xl bg-surface/60 px-4 py-3">
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{f.label}</p>
              <div className="flex items-start gap-2">
                <p className="font-mono text-[11px] font-medium text-foreground break-all leading-relaxed flex-1">
                  {f.value}
                </p>
                <button
                  onClick={() => copyText(f.value, f.key)}
                  className="shrink-0 mt-0.5 text-muted hover:text-foreground transition-colors"
                >
                  {copied === f.key ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
          ))}
          <div className="rounded-xl bg-surface/60 px-4 py-3">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Date</p>
            <p className="font-mono text-[11px] font-medium text-foreground">
              {tx.createdAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              {" "}
              {tx.createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ActivityFeed({ transactions }: { transactions: Transaction[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const items = ref.current.querySelectorAll("[data-feed-item]");
      if (!items.length) return;
      gsap.fromTo(
        items,
        { opacity: 0, x: -8 },
        {
          opacity: 1, x: 0, duration: 0.3, stagger: 0.04, ease: "power2.out",
          onComplete() { gsap.set(items, { clearProps: "transform,opacity" }); },
        },
      );
    },
    { scope: ref },
  );

  const groups = groupByDay(transactions);

  return (
    <>
      <div ref={ref} className="rounded-2xl border border-border bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5">
          <h2 className="text-sm font-medium text-foreground">Activity</h2>
          <Link
            href="/dashboard/payments"
            className="flex items-center gap-1 text-[11px] text-muted hover:text-foreground transition-colors"
          >
            All payments <ArrowRight size={11} />
          </Link>
        </div>

        {/* Feed */}
        <div className="px-5 pb-4">
          {transactions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-muted">No transactions yet</p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                {/* Day label */}
                <div className="flex items-center gap-3 py-2" data-feed-item>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-muted">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>

                {/* Transactions */}
                {group.transactions.map((tx) => {
                  const color = CRYPTO_COLORS[tx.payCurrency] ?? "#737373";
                  const status = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.pending;
                  const isIncoming = ["paid", "confirming"].includes(tx.status);

                  return (
                    <button
                      key={tx.id}
                      data-feed-item
                      onClick={() => setSelectedTx(tx)}
                      className="w-full flex items-center gap-3 rounded-xl px-2 py-2.5 -mx-2 transition-colors hover:bg-surface/50 group text-left"
                    >
                      {/* Icon */}
                      <div className="relative shrink-0">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full"
                          style={{ backgroundColor: color }}
                        >
                          <CryptoIcon symbol={tx.payCurrency} size={28} />
                        </div>
                        {/* Direction indicator */}
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-background",
                          isIncoming ? "bg-success" : "bg-surface",
                        )}>
                          {isIncoming ? (
                            <ArrowDownLeft className="h-2 w-2 text-white" />
                          ) : (
                            <ArrowUpRight className="h-2 w-2 text-muted" />
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground tabular-nums truncate">
                            {tx.cryptoAmount} {tx.payCurrency}
                          </span>
                          <span className="text-[11px] text-muted tabular-nums hidden xs:inline">
                            ${tx.amount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                          <span className={cn("text-[10px] font-medium", status.text)}>
                            {status.label}
                          </span>
                        </div>
                      </div>

                      {/* Time */}
                      <span className="text-[11px] text-muted tabular-nums shrink-0 group-hover:text-foreground-secondary transition-colors">
                        {timeAgo(tx.createdAt)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {selectedTx && (
        <DetailOverlay tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </>
  );
}
