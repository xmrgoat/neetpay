"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  Copy,
  Check,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CRYPTO_COLORS } from "@/lib/constants";
import type { WalletTransaction, WalletTxType, WalletTxStatus } from "@/types/wallet";

const TYPE_CONFIG: Record<WalletTxType, { label: string; icon: typeof ArrowUpRight; color: string; bgColor: string }> = {
  deposit: { label: "Deposit", icon: ArrowDownLeft, color: "text-success", bgColor: "bg-success-muted" },
  withdrawal: { label: "Withdrawal", icon: ArrowUpRight, color: "text-error", bgColor: "bg-error-muted" },
  received: { label: "Received", icon: ArrowDownLeft, color: "text-info", bgColor: "bg-info-muted" },
};

const STATUS_STYLES: Record<WalletTxStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: "bg-amber-500/10", text: "text-amber-500", dot: "bg-amber-500" },
  confirmed: { bg: "bg-emerald-500/10", text: "text-emerald-500", dot: "bg-emerald-500" },
  failed: { bg: "bg-red-500/10", text: "text-red-500", dot: "bg-red-500" },
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "deposit", label: "Deposits" },
  { key: "withdrawal", label: "Withdrawals" },
  { key: "received", label: "Received" },
] as const;

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function formatAmount(amount: number): string {
  if (amount >= 1000) return amount.toLocaleString("en-US", { maximumFractionDigits: 4 });
  if (amount >= 1) return amount.toFixed(4);
  if (amount >= 0.001) return amount.toFixed(6);
  return amount.toFixed(8);
}

export function WalletTransactions() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<string>("all");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const limit = 10;

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filter !== "all") params.set("type", filter);

      const res = await fetch(`/api/dashboard/wallet/transactions?${params}`);
      const data = await res.json();
      setTransactions(data.transactions ?? []);
      setPages(data.pages ?? 1);
      setTotal(data.total ?? 0);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useGSAP(
    () => {
      if (!containerRef.current || loading) return;
      const rows = containerRef.current.querySelectorAll("[data-tx-row]");
      if (rows.length === 0) return;
      gsap.from(rows, {
        opacity: 0,
        y: 6,
        duration: 0.25,
        stagger: 0.03,
        ease: "power2.out",
      });
    },
    { scope: containerRef, dependencies: [transactions, loading] },
  );

  const copyHash = async (hash: string) => {
    await navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="rounded-xl border border-border bg-background">
      {/* Header with filters */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-sm font-medium text-foreground">Wallet Transactions</h2>
        <div className="flex items-center gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                setPage(1);
              }}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                filter === f.key
                  ? "bg-primary-muted text-primary"
                  : "text-muted hover:text-foreground-secondary",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div ref={containerRef}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Inbox size={28} className="text-muted/40" />
            <p className="mt-3 text-xs text-muted">No transactions yet</p>
            <p className="mt-0.5 text-[11px] text-muted/60">
              Deposits and withdrawals will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((tx) => {
              const config = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.deposit;
              const statusStyle = STATUS_STYLES[tx.status] ?? STATUS_STYLES.pending;
              const TypeIcon = config.icon;
              const dotColor = CRYPTO_COLORS[tx.symbol] ?? "#71717a";

              return (
                <div
                  key={tx.id}
                  data-tx-row
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface/30"
                >
                  {/* Type icon */}
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      config.bgColor,
                    )}
                  >
                    <TypeIcon size={16} className={config.color} />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {config.label}
                      </p>
                      {/* Status badge */}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          statusStyle.bg,
                          statusStyle.text,
                        )}
                      >
                        <span className={cn("h-1 w-1 rounded-full", statusStyle.dot)} aria-hidden />
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </span>
                    </div>
                    {/* Tx hash + explorer link */}
                    {tx.txHash ? (
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono text-[11px] text-muted truncate">
                          {truncateHash(tx.txHash)}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyHash(tx.txHash!)}
                          className="shrink-0 rounded p-0.5 text-muted hover:text-foreground-secondary transition-colors"
                          aria-label="Copy transaction hash"
                        >
                          {copiedHash === tx.txHash ? (
                            <Check size={10} className="text-success" />
                          ) : (
                            <Copy size={10} />
                          )}
                        </button>
                        {tx.explorerUrl && (
                          <a
                            href={tx.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded p-0.5 text-muted hover:text-foreground-secondary transition-colors"
                            aria-label="View on explorer"
                          >
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    ) : tx.address ? (
                      <p className="mt-0.5 font-mono text-[11px] text-muted truncate">
                        {truncateHash(tx.address)}
                      </p>
                    ) : null}
                  </div>

                  {/* Right: amount + time */}
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-medium tabular-nums text-foreground">
                      <span className={tx.type === "withdrawal" ? "text-error" : "text-success"}>
                        {tx.type === "withdrawal" ? "-" : "+"}
                        {formatAmount(tx.amount)}
                      </span>
                      <span className="ml-1 text-xs text-muted uppercase">
                        {tx.symbol}
                      </span>
                    </p>
                    {tx.valueUsd > 0 && (
                      <p className="text-[11px] text-muted tabular-nums">
                        ${tx.valueUsd.toFixed(2)}
                      </p>
                    )}
                    <p className="text-[11px] text-muted tabular-nums">
                      {relativeTime(tx.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted">
            Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 h-8 px-3 text-xs border border-border rounded-lg hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs text-muted tabular-nums">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="inline-flex items-center gap-1 h-8 px-3 text-xs border border-border rounded-lg hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
