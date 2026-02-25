"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowUpRight, ArrowDownRight, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { CRYPTO_COLORS } from "@/lib/constants";
import type { WalletAsset } from "@/types/wallet";

interface AssetListProps {
  assets: WalletAsset[];
  onSend?: (asset: WalletAsset) => void;
  onReceive?: (asset: WalletAsset) => void;
}

const CHAIN_LABELS: Record<string, string> = {
  ethereum: "Ethereum",
  bitcoin: "Bitcoin",
  solana: "Solana",
  monero: "Monero",
  tron: "Tron",
  bsc: "BSC",
  polygon: "Polygon",
  arbitrum: "Arbitrum",
  base: "Base",
  optimism: "Optimism",
};

function formatCryptoBalance(amount: number): string {
  if (amount === 0) return "0";
  if (amount >= 1000) return amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (amount >= 1) return amount.toFixed(4);
  if (amount >= 0.001) return amount.toFixed(6);
  return amount.toFixed(8);
}

function formatUsd(value: number): string {
  if (value === 0) return "$0.00";
  if (value < 0.01) return "<$0.01";
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

export function AssetList({ assets, onSend, onReceive }: AssetListProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [showZero, setShowZero] = useState(true);

  const sorted = [...assets].sort((a, b) => b.valueUsd - a.valueUsd);
  const displayed = showZero ? sorted : sorted.filter((a) => a.balance > 0);

  useGSAP(
    () => {
      const rows = tableRef.current?.querySelectorAll("[data-asset-row]") ?? [];
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

  return (
    <div className="rounded-xl border border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-sm font-medium text-foreground">Assets</h2>
        <button
          type="button"
          onClick={() => setShowZero((prev) => !prev)}
          className="text-xs text-muted hover:text-foreground-secondary transition-colors"
        >
          {showZero ? "Hide zero balances" : "Show all"}
        </button>
      </div>

      {/* Table */}
      <div ref={tableRef} className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface/30 border-b border-border">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                Asset
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted">
                Price
              </th>
              <th className="hidden md:table-cell px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted">
                24h
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted">
                Balance
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted">
                Value
              </th>
            </tr>
          </thead>

          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <Coins size={32} className="text-muted/30 mb-2" />
                    <p className="text-xs text-muted">No assets with balance</p>
                  </div>
                </td>
              </tr>
            ) : (
              displayed.map((asset) => {
                const dotColor = CRYPTO_COLORS[asset.symbol] ?? "#71717a";
                const chainLabel = CHAIN_LABELS[asset.chain] ?? asset.chain;
                const isPositive = asset.change24h >= 0;
                const hasBalance = asset.balance > 0;

                return (
                  <tr
                    key={asset.key}
                    data-asset-row
                    className={cn(
                      "border-b border-border last:border-0 transition-colors duration-100",
                      hasBalance
                        ? "hover:bg-surface/50"
                        : "opacity-50",
                    )}
                  >
                    {/* Asset info */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${dotColor}15` }}
                        >
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: dotColor }}
                          />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {asset.symbol}
                          </p>
                          <p className="text-[11px] text-muted truncate">
                            {asset.name}
                            {!asset.native && (
                              <span className="ml-1 text-muted/60">
                                {chainLabel}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="hidden sm:table-cell px-4 py-3.5 text-right">
                      <span className="font-mono text-xs text-foreground-secondary tabular-nums">
                        {formatPrice(asset.priceUsd)}
                      </span>
                    </td>

                    {/* 24h change */}
                    <td className="hidden md:table-cell px-4 py-3.5 text-right">
                      {asset.change24h !== 0 ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
                            isPositive ? "text-success" : "text-error",
                          )}
                        >
                          {isPositive ? (
                            <ArrowUpRight size={12} strokeWidth={2.5} />
                          ) : (
                            <ArrowDownRight size={12} strokeWidth={2.5} />
                          )}
                          {Math.abs(asset.change24h).toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted">&mdash;</span>
                      )}
                    </td>

                    {/* Balance */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-mono text-sm text-foreground tabular-nums">
                        {formatCryptoBalance(asset.balance)}
                      </span>
                    </td>

                    {/* USD Value */}
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-mono text-sm font-medium text-foreground tabular-nums">
                        {formatUsd(asset.valueUsd)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
