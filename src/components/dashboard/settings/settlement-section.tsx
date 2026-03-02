"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";

interface SettlementSectionProps {
  xmrSettlementAddress: string | null;
  autoForwardEnabled: boolean;
  platformFeePercent: number;
  minForwardAmount: number;
}

export function SettlementSection({
  xmrSettlementAddress: initialAddress,
  autoForwardEnabled: initialAutoForward,
  platformFeePercent,
  minForwardAmount: initialMinAmount,
}: SettlementSectionProps) {
  const [address, setAddress] = useState(initialAddress || "");
  const [autoForward, setAutoForward] = useState(initialAutoForward);
  const [minAmount, setMinAmount] = useState(String(initialMinAmount));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/settlement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          xmrSettlementAddress: address.trim() || null,
          autoForwardEnabled: autoForward,
          minForwardAmount: parseFloat(minAmount) || 0.001,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Settlement config saved" });
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-elevated p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-heading text-base font-medium">Settlement</h2>
          <p className="text-xs text-muted mt-0.5">
            Auto-forward confirmed XMR payments to your cold wallet
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1.5 text-xs text-muted">
          <ShieldCheck size={12} className="text-success" />
          {platformFeePercent}% platform fee
        </div>
      </div>

      <div className="space-y-4 max-w-lg">
        {/* XMR settlement address */}
        <Input
          label="XMR cold wallet address"
          placeholder="4... or 8... (primary or subaddress)"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setMessage(null);
          }}
          className="font-mono text-xs"
        />

        {/* Auto-forward toggle */}
        <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Auto-forward</p>
            <p className="text-xs text-muted mt-0.5">
              Automatically forward net amount after confirmation
            </p>
          </div>
          <button
            onClick={() => setAutoForward(!autoForward)}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              autoForward ? "bg-primary" : "bg-border"
            }`}
            role="switch"
            aria-checked={autoForward}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                autoForward ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Min forward amount */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              label="Minimum forward amount (XMR)"
              placeholder="0.001"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              type="number"
              min="0"
              step="0.001"
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-10"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>

        {message && (
          <p
            className={`text-xs flex items-center gap-1.5 ${
              message.type === "success" ? "text-success" : "text-error"
            }`}
          >
            {message.type === "error" && <AlertTriangle size={12} />}
            {message.text}
          </p>
        )}

        {/* Info box */}
        <div className="rounded-lg bg-surface border border-border p-4 text-xs text-muted space-y-1.5">
          <p>
            <span className="text-foreground-secondary font-medium">How it works:</span>{" "}
            When a payment is confirmed (10 blocks), neetpay deducts {platformFeePercent}% and
            auto-forwards the rest to your cold wallet via monero-wallet-rpc.
          </p>
          <p>
            Network fees are deducted from the forwarded amount. Without a settlement address,
            funds accumulate in your dashboard balance for manual withdrawal.
          </p>
        </div>
      </div>
    </section>
  );
}
