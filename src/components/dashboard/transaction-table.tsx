"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, ChevronDown, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Payment } from "@/types";
import type { PaymentStatus } from "@/lib/constants";

interface TransactionTableProps {
  payments: Payment[];
}

const CHAIN_COLORS: Record<string, string> = {
  ethereum: "bg-[#627EEA]",
  bitcoin: "bg-[#F7931A]",
  solana: "bg-[#9945FF]",
  monero: "bg-[#FF6600]",
  tron: "bg-[#FF0013]",
  bsc: "bg-[#F0B90B]",
  polygon: "bg-[#8247E5]",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(date: Date | string): string {
  return dateFormatter.format(new Date(date));
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatCrypto(amount: number): string {
  if (amount >= 1000) return amount.toFixed(2);
  if (amount >= 1) return amount.toFixed(4);
  if (amount >= 0.001) return amount.toFixed(6);
  return amount.toFixed(8);
}

function truncateId(str: string): string {
  if (str.length <= 8) return str;
  return `${str.slice(0, 8)}\u2026`;
}

function truncateHash(str: string, len = 20): string {
  if (str.length <= len) return str;
  const side = Math.floor((len - 3) / 2);
  return `${str.slice(0, side)}\u2026${str.slice(-side)}`;
}

function DetailField({
  label,
  value,
  copyable = false,
  copiedField,
  fieldKey,
  onCopy,
}: {
  label: string;
  value: string | null | undefined;
  copyable?: boolean;
  copiedField?: string | null;
  fieldKey?: string;
  onCopy?: (text: string, field: string) => void;
}) {
  if (!value) return null;
  const isCopied = copiedField === fieldKey;

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted">{label}</p>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-foreground break-all">{value}</span>
        {copyable && onCopy && fieldKey && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCopy(value, fieldKey);
            }}
            className="shrink-0 rounded p-1 text-muted hover:text-foreground-secondary hover:bg-surface/80 transition-colors"
            aria-label={`Copy ${label.toLowerCase()}`}
          >
            {isCopied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}

export function TransactionTable({ payments }: TransactionTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  useGSAP(
    () => {
      const rows = tableRef.current?.querySelectorAll("tbody tr") ?? [];
      if (rows.length === 0) return;
      gsap.from(rows, {
        opacity: 0,
        y: 8,
        duration: 0.3,
        stagger: 0.03,
        ease: "power2.out",
      });
    },
    { scope: tableRef },
  );

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <ArrowLeftRight size={40} className="text-muted/30 mb-3" />
        <p className="text-sm text-muted mb-0.5">No transactions found</p>
        <p className="text-[11px] text-muted/60">
          Transactions will appear here once payments are made
        </p>
      </div>
    );
  }

  return (
    <div ref={tableRef} className="overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-surface/30 border-b border-border">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
              Track ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
              Amount
            </th>
            <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
              Crypto
            </th>
            <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
              Date
            </th>
            <th className="px-4 py-3 w-10">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {payments.map((payment) => {
            const isExpanded = expandedId === payment.id;
            const chainColor =
              CHAIN_COLORS[payment.chain ?? ""] ?? "bg-foreground-secondary/40";

            return (
              <tr key={payment.id} className="border-b border-border last:border-0">
                <td colSpan={6} className="p-0">
                  {/* Summary row */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedId(isExpanded ? null : payment.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpandedId(isExpanded ? null : payment.id);
                      }
                    }}
                    className="flex w-full items-center cursor-pointer transition-colors duration-100 hover:bg-surface/50"
                  >
                    <div className="px-4 py-3.5 w-24 shrink-0">
                      <Badge status={payment.status as PaymentStatus} />
                    </div>
                    <div className="px-4 py-3.5 flex-1 min-w-0">
                      <span className="font-mono text-xs text-foreground-secondary">
                        {truncateId(payment.trackId)}
                      </span>
                    </div>
                    <div className="px-4 py-3.5 shrink-0">
                      <span className="font-mono text-sm font-medium text-foreground">
                        {formatUsd(payment.amount)}
                      </span>
                    </div>
                    <div className="hidden md:flex items-center gap-2 px-4 py-3.5 flex-1 min-w-0">
                      {payment.payCurrency ? (
                        <>
                          <span className={cn("inline-block h-2 w-2 rounded-full shrink-0", chainColor)} aria-hidden />
                          <span className="font-mono text-xs text-foreground-secondary">
                            {payment.payAmount != null ? formatCrypto(payment.payAmount) : "\u2014"}{" "}
                            {payment.payCurrency}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted">&mdash;</span>
                      )}
                    </div>
                    <div className="hidden md:block px-4 py-3.5 shrink-0">
                      <span className="text-xs text-muted">{formatDate(payment.createdAt)}</span>
                    </div>
                    <div className="px-4 py-3.5 shrink-0">
                      <ChevronDown
                        size={14}
                        className={cn("text-muted transition-transform duration-200", isExpanded && "rotate-180")}
                      />
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  <div
                    className={cn(
                      "grid transition-all duration-200 ease-out",
                      isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="bg-surface/30 px-4 py-4 border-t border-border">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <DetailField
                            label="Track ID"
                            value={payment.trackId}
                            copyable
                            copiedField={copiedField}
                            fieldKey={`trackId-${payment.id}`}
                            onCopy={copyToClipboard}
                          />
                          <DetailField
                            label="Transaction Hash"
                            value={payment.txId}
                            copyable
                            copiedField={copiedField}
                            fieldKey={`txId-${payment.id}`}
                            onCopy={(_, field) => {
                              if (payment.txId) copyToClipboard(payment.txId, field);
                            }}
                          />
                          <DetailField
                            label="Pay Address"
                            value={payment.payAddress ? truncateHash(payment.payAddress, 32) : null}
                            copyable
                            copiedField={copiedField}
                            fieldKey={`payAddr-${payment.id}`}
                            onCopy={(_, field) => {
                              if (payment.payAddress) copyToClipboard(payment.payAddress, field);
                            }}
                          />
                          <DetailField
                            label="Network"
                            value={
                              payment.chain
                                ? `${payment.chain}${payment.network ? ` (${payment.network})` : ""}`
                                : null
                            }
                          />
                          {payment.confirmations != null && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted">Confirmations</p>
                              <span className="font-mono text-xs text-foreground">
                                {payment.confirmations} / {payment.requiredConfs ?? "?"}
                              </span>
                            </div>
                          )}
                          <DetailField
                            label="Sender Address"
                            value={payment.senderAddress ? truncateHash(payment.senderAddress, 32) : null}
                            copyable
                            copiedField={copiedField}
                            fieldKey={`sender-${payment.id}`}
                            onCopy={(_, field) => {
                              if (payment.senderAddress) copyToClipboard(payment.senderAddress, field);
                            }}
                          />

                          {/* Mobile-only fields */}
                          <div className="md:hidden space-y-1">
                            <p className="text-xs text-muted">Crypto</p>
                            {payment.payCurrency ? (
                              <div className="flex items-center gap-2">
                                <span className={cn("inline-block h-2 w-2 rounded-full shrink-0", chainColor)} aria-hidden />
                                <span className="font-mono text-xs text-foreground">
                                  {payment.payAmount != null ? formatCrypto(payment.payAmount) : "\u2014"}{" "}
                                  {payment.payCurrency}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted">&mdash;</span>
                            )}
                          </div>
                          <div className="md:hidden space-y-1">
                            <p className="text-xs text-muted">Date</p>
                            <span className="font-mono text-xs text-foreground">{formatDate(payment.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
