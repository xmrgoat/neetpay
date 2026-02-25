"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { CRYPTO_COLORS } from "@/lib/constants";
import type { WalletAsset } from "@/types/wallet";

interface SendDialogProps {
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

const ESTIMATED_FEES: Record<string, { fee: string; unit: string }> = {
  ethereum: { fee: "~0.001", unit: "ETH" },
  bitcoin: { fee: "~0.00005", unit: "BTC" },
  solana: { fee: "~0.000005", unit: "SOL" },
  monero: { fee: "~0.0001", unit: "XMR" },
  tron: { fee: "~1", unit: "TRX" },
  bsc: { fee: "~0.0005", unit: "BNB" },
  polygon: { fee: "~0.01", unit: "MATIC" },
};

function formatCryptoBalance(amount: number): string {
  if (amount === 0) return "0";
  if (amount >= 1000) return amount.toLocaleString("en-US", { maximumFractionDigits: 4 });
  if (amount >= 1) return amount.toFixed(6);
  return amount.toFixed(8);
}

export function SendDialog({ open, onClose, assets, initialAssetKey }: SendDialogProps) {
  const [selectedKey, setSelectedKey] = useState(initialAssetKey ?? "");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedAsset = assets.find((a) => a.key === selectedKey);
  const fee = selectedAsset ? ESTIMATED_FEES[selectedAsset.chain] : null;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedKey(initialAssetKey ?? "");
      setAddress("");
      setAmount("");
      setError(null);
      setSuccess(false);
    }
  }, [open, initialAssetKey]);

  const handleMaxAmount = useCallback(() => {
    if (selectedAsset) {
      setAmount(formatCryptoBalance(selectedAsset.balance));
    }
  }, [selectedAsset]);

  const handleSubmit = async () => {
    if (!selectedAsset || !address.trim() || !amount.trim()) {
      setError("All fields are required.");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    if (parsedAmount > selectedAsset.balance) {
      setError("Insufficient balance.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/dashboard/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currencyKey: selectedKey,
          address: address.trim(),
          amount: parsedAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Withdrawal failed. Try again.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const assetsWithBalance = assets.filter((a) => a.balance > 0);

  return (
    <Dialog open={open} onClose={onClose} title={success ? "Withdrawal Submitted" : "Send Crypto"} size="md">
      {success ? (
        <div className="text-center py-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-muted">
            <Send size={20} className="text-success" />
          </div>
          <p className="text-sm text-foreground mb-1">Transaction submitted</p>
          <p className="text-xs text-muted">
            Sending {amount} {selectedAsset?.symbol} to{" "}
            <span className="font-mono">{address.slice(0, 8)}...{address.slice(-6)}</span>
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-6"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Currency selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground-secondary">
              Currency
            </label>
            <select
              value={selectedKey}
              onChange={(e) => {
                setSelectedKey(e.target.value);
                setError(null);
              }}
              className="flex h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground transition-all duration-150 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20"
            >
              <option value="">Select currency</option>
              {assetsWithBalance.map((a) => {
                const dot = CRYPTO_COLORS[a.symbol] ?? "#71717a";
                return (
                  <option key={a.key} value={a.key}>
                    {a.symbol} — {a.name} ({formatCryptoBalance(a.balance)})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Chain info */}
          {selectedAsset && (
            <div className="flex items-center gap-2 rounded-lg bg-surface/60 px-3 py-2">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: CRYPTO_COLORS[selectedAsset.symbol] ?? "#71717a" }}
              />
              <span className="text-xs text-foreground-secondary">
                {CHAIN_LABELS[selectedAsset.chain] ?? selectedAsset.chain} network
              </span>
              <span className="ml-auto font-mono text-xs text-muted tabular-nums">
                Balance: {formatCryptoBalance(selectedAsset.balance)} {selectedAsset.symbol}
              </span>
            </div>
          )}

          {/* Recipient address */}
          <Input
            label="Recipient Address"
            placeholder="Enter wallet address"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setError(null);
            }}
            className="font-mono text-xs"
          />

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground-secondary">
                Amount
              </label>
              {selectedAsset && (
                <button
                  type="button"
                  onClick={handleMaxAmount}
                  className="text-[11px] font-medium text-primary hover:text-primary-hover transition-colors"
                >
                  Max
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*\.?\d*$/.test(val)) {
                    setAmount(val);
                    setError(null);
                  }
                }}
                placeholder="0.00"
                className="flex h-9 w-full rounded-lg border border-border bg-surface px-3 pr-16 font-mono text-sm text-foreground placeholder:text-muted transition-all duration-150 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20"
              />
              {selectedAsset && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted">
                  {selectedAsset.symbol}
                </span>
              )}
            </div>
            {amount && selectedAsset && parseFloat(amount) > 0 && (
              <p className="text-[11px] text-muted tabular-nums">
                ~${(parseFloat(amount) * selectedAsset.priceUsd).toFixed(2)} USD
              </p>
            )}
          </div>

          {/* Fee estimate */}
          {fee && (
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-surface/30 px-3 py-2.5">
              <span className="text-xs text-muted">Estimated network fee</span>
              <span className="font-mono text-xs text-foreground-secondary tabular-nums">
                {fee.fee} {fee.unit}
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-error-muted px-3 py-2.5">
              <AlertTriangle size={14} className="shrink-0 text-error" />
              <p className="text-xs text-error">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={loading}
              disabled={!selectedKey || !address.trim() || !amount.trim()}
              onClick={handleSubmit}
            >
              <Send size={14} />
              Send
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
