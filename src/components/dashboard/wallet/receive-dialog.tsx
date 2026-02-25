"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Download } from "lucide-react";
import { CRYPTO_COLORS } from "@/lib/constants";
import type { WalletAsset, WalletDepositInfo } from "@/types/wallet";

interface ReceiveDialogProps {
  open: boolean;
  onClose: () => void;
  assets: WalletAsset[];
  initialAssetKey?: string;
}

const CHAIN_LABELS: Record<string, string> = {
  ethereum: "Ethereum",
  bitcoin: "Bitcoin",
  solana: "Solana",
  monero: "Monero",
  tron: "Tron",
  bsc: "BSC",
  polygon: "Polygon",
};

export function ReceiveDialog({ open, onClose, assets, initialAssetKey }: ReceiveDialogProps) {
  const [selectedKey, setSelectedKey] = useState(initialAssetKey ?? "");
  const [depositInfo, setDepositInfo] = useState<WalletDepositInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedAsset = assets.find((a) => a.key === selectedKey);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedKey(initialAssetKey ?? "");
      setDepositInfo(null);
      setError(null);
      setCopied(false);
    }
  }, [open, initialAssetKey]);

  // Fetch deposit address when currency changes
  useEffect(() => {
    if (!selectedKey || !open) return;

    let cancelled = false;
    setLoading(true);
    setDepositInfo(null);
    setError(null);

    async function fetchAddress() {
      try {
        const res = await fetch("/api/dashboard/wallet/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currencyKey: selectedKey }),
        });
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok || !data.address) {
          setError(data.error ?? "Failed to fetch deposit address.");
          return;
        }

        setDepositInfo({
          address: data.address,
          memo: data.memo,
          chain: data.chain ?? selectedAsset?.chain ?? "",
          currencyKey: selectedKey,
          symbol: data.symbol ?? selectedAsset?.symbol ?? "",
        });
      } catch {
        if (!cancelled) {
          setError("Network error. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAddress();
    return () => { cancelled = true; };
  }, [selectedKey, open, selectedAsset?.chain, selectedAsset?.symbol]);

  const handleCopy = useCallback(async () => {
    if (!depositInfo?.address) return;
    await navigator.clipboard.writeText(depositInfo.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [depositInfo?.address]);

  return (
    <Dialog open={open} onClose={onClose} title="Receive Crypto" size="md">
      <div className="space-y-4">
        {/* Currency selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground-secondary">
            Currency
          </label>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground transition-all duration-150 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20"
          >
            <option value="">Select currency</option>
            {assets.map((a) => (
              <option key={a.key} value={a.key}>
                {a.symbol} -- {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Chain info badge */}
        {selectedAsset && (
          <div className="flex items-center gap-2 rounded-lg bg-surface/60 px-3 py-2">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: CRYPTO_COLORS[selectedAsset.symbol] ?? "#71717a" }}
            />
            <span className="text-xs text-foreground-secondary">
              {CHAIN_LABELS[selectedAsset.chain] ?? selectedAsset.chain} network
            </span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-lg bg-error-muted px-3 py-2.5">
            <p className="text-xs text-error">{error}</p>
          </div>
        )}

        {/* Deposit address display */}
        {depositInfo && !loading && (
          <div className="space-y-3">
            {/* Address box */}
            <div className="rounded-lg border border-border bg-surface/50 p-4">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
                Deposit Address
              </p>
              <div className="flex items-start gap-2">
                <p className="flex-1 break-all font-mono text-xs leading-relaxed text-foreground select-all">
                  {depositInfo.address}
                </p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 rounded-lg p-2 text-muted hover:text-foreground hover:bg-surface transition-colors"
                  aria-label="Copy address"
                >
                  {copied ? (
                    <Check size={14} className="text-success" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>

              {/* Memo if applicable */}
              {depositInfo.memo && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted">
                    Memo / Tag
                  </p>
                  <p className="font-mono text-xs text-foreground select-all">
                    {depositInfo.memo}
                  </p>
                </div>
              )}
            </div>

            {/* Copy button full-width */}
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check size={14} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy Address
                </>
              )}
            </Button>

            {/* Warning */}
            <div className="rounded-lg bg-warning-muted px-3 py-2.5">
              <p className="text-[11px] text-warning leading-relaxed">
                Only send{" "}
                <span className="font-semibold">{depositInfo.symbol}</span> on the{" "}
                <span className="font-semibold">
                  {CHAIN_LABELS[depositInfo.chain] ?? depositInfo.chain}
                </span>{" "}
                network to this address. Sending other assets may result in permanent loss.
              </p>
            </div>
          </div>
        )}

        {/* No selection prompt */}
        {!selectedKey && !loading && (
          <div className="flex flex-col items-center py-8">
            <Download size={28} className="text-muted/30 mb-2" />
            <p className="text-xs text-muted">Select a currency to get your deposit address</p>
          </div>
        )}

        {/* Close */}
        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
