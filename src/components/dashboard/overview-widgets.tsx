"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Link as LinkIcon,
  ChevronRight,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CRYPTO_COLORS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WalletWidgetProps {
  totalUsd: number;
  holdings: { currency: string; amount: number; usdValue: number }[];
}

interface QuickActionsProps {
  className?: string;
}

interface FunnelMiniProps {
  created: number;
  confirming: number;
  paid: number;
}

interface TopChainsProps {
  chains: { chain: string; count: number; volume: number }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCryptoAmount(amount: number): string {
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(2)}K`;
  if (amount >= 1) return amount.toFixed(4);
  if (amount >= 0.001) return amount.toFixed(6);
  return amount.toFixed(8);
}

function getCryptoColor(symbol: string): string {
  return CRYPTO_COLORS[symbol.toUpperCase()] ?? "#737373";
}

// ---------------------------------------------------------------------------
// Wallet Balance Widget
// ---------------------------------------------------------------------------

export function WalletWidget({ totalUsd, holdings }: WalletWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      gsap.from(containerRef.current, {
        opacity: 0,
        y: 12,
        duration: 0.5,
        ease: "power2.out",
      });
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="rounded-xl border border-border bg-background p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-muted">
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-medium text-foreground">Wallet</h2>
        </div>
        <Link
          href="/dashboard/wallet"
          className="flex items-center gap-0.5 text-xs text-muted hover:text-foreground transition-colors"
        >
          View
          <ChevronRight size={12} />
        </Link>
      </div>

      {/* Total balance */}
      <p className="mt-4 font-heading text-2xl font-semibold tabular-nums text-foreground">
        {formatCurrency(totalUsd)}
      </p>
      <p className="text-[11px] text-muted">Total received (USD)</p>

      {/* Top holdings */}
      {holdings.length > 0 && (
        <div className="mt-4 space-y-2">
          {holdings.slice(0, 3).map((h) => (
            <div key={h.currency} className="flex items-center gap-2.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: getCryptoColor(h.currency) }}
              />
              <span className="w-10 font-mono text-xs font-medium text-foreground-secondary uppercase">
                {h.currency}
              </span>
              <span className="flex-1 text-right font-mono text-xs text-muted tabular-nums">
                {formatCryptoAmount(h.amount)}
              </span>
              <span className="w-16 text-right font-mono text-[11px] text-muted tabular-nums">
                {formatCurrency(h.usdValue)}
              </span>
            </div>
          ))}
        </div>
      )}

      {holdings.length === 0 && (
        <p className="mt-4 text-xs text-muted">No holdings yet</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Actions Row
// ---------------------------------------------------------------------------

const quickActions = [
  {
    label: "Send",
    icon: ArrowUpRight,
    href: "/dashboard/wallet",
  },
  {
    label: "Receive",
    icon: ArrowDownLeft,
    href: "/dashboard/wallet",
  },
  {
    label: "Create Link",
    icon: LinkIcon,
    href: "/dashboard/links",
  },
] as const;

export function QuickActions({ className }: QuickActionsProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {quickActions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground-secondary transition-colors duration-150 hover:border-border-hover hover:text-foreground"
        >
          <action.icon className="h-4 w-4" />
          <span className="text-xs font-medium">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversion Funnel Mini
// ---------------------------------------------------------------------------

export function FunnelMini({ created, confirming, paid }: FunnelMiniProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      gsap.from(containerRef.current, {
        opacity: 0,
        y: 12,
        duration: 0.5,
        delay: 0.1,
        ease: "power2.out",
      });
    },
    { scope: containerRef }
  );

  const stages = [
    { label: "Created", count: created, color: "bg-info" },
    { label: "Engaged", count: confirming, color: "bg-warning" },
    { label: "Paid", count: paid, color: "bg-success" },
  ];

  const maxCount = Math.max(created, 1);

  // Conversion rates
  const engagedRate = created > 0 ? ((confirming / created) * 100).toFixed(1) : "0";
  const paidRate = created > 0 ? ((paid / created) * 100).toFixed(1) : "0";

  return (
    <div
      ref={containerRef}
      className="rounded-xl border border-border bg-background p-5"
    >
      <h2 className="text-sm font-medium text-foreground">Conversion Funnel</h2>
      <p className="text-xs text-muted">Payment flow breakdown</p>

      {created > 0 ? (
        <>
          <div className="mt-4 space-y-3">
            {stages.map((stage) => {
              const pct = (stage.count / maxCount) * 100;
              return (
                <div key={stage.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-foreground-secondary">
                      {stage.label}
                    </span>
                    <span className="font-mono text-xs font-medium text-foreground tabular-nums">
                      {stage.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", stage.color)}
                      style={{ width: `${Math.max(pct, 3)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Conversion rates */}
          <div className="mt-3 flex items-center gap-4 border-t border-border pt-3">
            <div>
              <p className="text-[11px] text-muted">Engaged</p>
              <p className="font-mono text-xs font-medium text-foreground tabular-nums">
                {engagedRate}%
              </p>
            </div>
            <div className="h-4 w-px bg-border" />
            <div>
              <p className="text-[11px] text-muted">Converted</p>
              <p className="font-mono text-xs font-medium text-foreground tabular-nums">
                {paidRate}%
              </p>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-4 text-xs text-muted">No payment data yet</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top Chains Widget
// ---------------------------------------------------------------------------

export function TopChains({ chains }: TopChainsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      gsap.from(containerRef.current, {
        opacity: 0,
        y: 12,
        duration: 0.5,
        delay: 0.15,
        ease: "power2.out",
      });
    },
    { scope: containerRef }
  );

  const CHAIN_LABELS: Record<string, string> = {
    evm: "Ethereum / EVM",
    solana: "Solana",
    bitcoin: "Bitcoin",
    tron: "Tron",
    monero: "Monero",
  };

  const totalVolume = chains.reduce((s, c) => s + c.volume, 0);
  const maxVolume = chains[0]?.volume || 1;

  return (
    <div
      ref={containerRef}
      className="rounded-xl border border-border bg-background p-5"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-muted">
          <Globe className="h-4 w-4 text-info" />
        </div>
        <h2 className="text-sm font-medium text-foreground">Top Chains</h2>
      </div>

      {chains.length > 0 ? (
        <div className="mt-4 space-y-2.5">
          {chains.slice(0, 5).map((entry) => {
            const pct = totalVolume > 0
              ? ((entry.volume / totalVolume) * 100).toFixed(1)
              : "0";
            const barPct = (entry.volume / maxVolume) * 100;
            return (
              <div key={entry.chain} className="flex items-center gap-3">
                <span className="w-24 truncate text-xs text-foreground-secondary">
                  {CHAIN_LABELS[entry.chain] ?? entry.chain}
                </span>
                <div className="flex-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-info transition-all duration-500"
                      style={{ width: `${Math.max(barPct, 4)}%` }}
                    />
                  </div>
                </div>
                <span className="w-8 text-right font-mono text-xs font-medium text-foreground tabular-nums">
                  {entry.count}
                </span>
                <span className="w-12 text-right font-mono text-[11px] text-muted tabular-nums">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted">No chain data yet</p>
      )}
    </div>
  );
}
