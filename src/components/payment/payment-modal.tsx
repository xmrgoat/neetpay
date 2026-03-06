"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink } from "lucide-react";
import type { PaymentStatus } from "@/lib/constants";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  trackId: string;
  payLink?: string;
}

interface PaymentData {
  trackId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payCurrency?: string;
  payAmount?: number;
  payAddress?: string;
  network?: string;
}

export function PaymentModal({
  open,
  onClose,
  trackId,
  payLink,
}: PaymentModalProps) {
  const [data, setData] = useState<PaymentData | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/payment/status/${trackId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Silently fail, will retry on next poll
    }
  }, [trackId]);

  useEffect(() => {
    if (!open || !trackId) return;

    fetchStatus();
    const interval = setInterval(fetchStatus, 10_000);
    return () => clearInterval(interval);
  }, [open, trackId, fetchStatus]);

  async function copyAddress() {
    if (!data?.payAddress) return;
    await navigator.clipboard.writeText(data.payAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isPending = !data || ["new", "waiting"].includes(data.status);
  const isFinal = data && ["paid", "failed", "expired"].includes(data.status);

  return (
    <Dialog open={open} onClose={onClose} title="Payment">
      <div className="space-y-6">
        {/* Amount */}
        {data && (
          <div className="text-center">
            <p className="font-heading text-3xl font-bold">
              ${data.amount.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-foreground-secondary uppercase">
              {data.currency}
            </p>
          </div>
        )}

        {/* Status */}
        {data && (
          <div className="flex justify-center">
            <Badge status={data.status} />
          </div>
        )}

        {/* Pay address */}
        {data?.payAddress && (
          <div className="rounded-lg border border-border bg-elevated p-4">
            <p className="text-xs text-foreground-secondary mb-2">
              Send{" "}
              <span className="font-mono font-medium text-foreground">
                {data.payAmount} {data.payCurrency}
              </span>{" "}
              {data.network && (
                <span className="text-muted">
                  ({data.network})
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all font-mono text-xs text-foreground">
                {data.payAddress}
              </code>
              <button
                onClick={copyAddress}
                className="shrink-0 rounded-md p-1.5 text-foreground-secondary hover:text-foreground hover:bg-surface transition-colors"
              >
                <Copy size={14} />
              </button>
            </div>
            {copied && (
              <p className="mt-2 text-xs text-primary">Copied to clipboard</p>
            )}
          </div>
        )}

        {/* External pay link */}
        {payLink && isPending && (
          <a
            href={payLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button className="w-full" variant="primary">
              Pay with OxaPay
              <ExternalLink size={14} />
            </Button>
          </a>
        )}

        {/* Loading state */}
        {!data && (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        )}

        {/* Final state */}
        {isFinal && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={onClose}
          >
            Close
          </Button>
        )}

        {/* Track ID */}
        <p className="text-center font-mono text-[10px] text-muted">
          {trackId}
        </p>
      </div>
    </Dialog>
  );
}
