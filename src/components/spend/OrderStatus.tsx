"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  XCircle,
} from "lucide-react";
import { API_URL } from "@/lib/constants";

interface CardOrderDetail {
  id: string;
  order_type: string;
  provider: string;
  currency_code: string;
  amount_fiat: number;
  ticker_from: string;
  deposit_address: string;
  deposit_amount: string;
  status: string;
  card_details?: Record<string, unknown> | null;
  created_at: string;
}

interface OrderStatusProps {
  orderId: string;
  onBack: () => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof Clock }
> = {
  pending: { label: "Awaiting payment", color: "#eab308", icon: Clock },
  paid: { label: "Payment received", color: "#3b82f6", icon: Loader2 },
  delivered: { label: "Delivered", color: "#22c55e", icon: CheckCircle2 },
  failed: { label: "Failed", color: "#ef4444", icon: XCircle },
};

export function OrderStatus({ orderId, onBack }: OrderStatusProps) {
  const [order, setOrder] = useState<CardOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/v1/cards/order/${orderId}`, {
        headers: {
          "X-API-Key": localStorage.getItem("api_key") || "",
        },
      });
      if (res.ok) {
        setOrder(await res.json());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Poll every 15s while pending/paid
  useEffect(() => {
    if (!order || order.status === "delivered" || order.status === "failed")
      return;

    const interval = setInterval(fetchOrder, 15_000);
    return () => clearInterval(interval);
  }, [order, fetchOrder]);

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <XCircle className="h-10 w-10 text-error" />
        <p className="text-sm text-foreground-secondary">Order not found.</p>
        <button
          onClick={onBack}
          className="text-sm text-primary hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;
  const isTerminal =
    order.status === "delivered" || order.status === "failed";

  return (
    <div className="mx-auto w-full max-w-md">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-sm text-foreground-secondary hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="rounded-xl border border-border bg-white/[0.02] p-6">
        {/* Status badge */}
        <div className="flex items-center gap-2 mb-4">
          <StatusIcon
            className={`h-5 w-5 ${
              order.status === "paid" ? "animate-spin" : ""
            }`}
            style={{ color: config.color }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: config.color }}
          >
            {config.label}
          </span>
        </div>

        <h2 className="font-heading text-lg font-semibold">
          {order.order_type === "prepaid" ? "Prepaid Card" : "Gift Card"} Order
        </h2>
        <p className="mt-1 text-xs text-muted">
          {order.amount_fiat} {order.currency_code} &middot; {order.provider}
        </p>

        {/* Deposit info (show while pending) */}
        {order.status === "pending" && order.deposit_address && (
          <div className="mt-5 flex flex-col gap-3">
            <div className="rounded-lg bg-white/[0.04] p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted mb-1">
                Send {order.deposit_amount} {order.ticker_from} to
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all text-xs text-foreground">
                  {order.deposit_address}
                </code>
                <button
                  onClick={() =>
                    copyToClipboard(order.deposit_address, "address")
                  }
                  className="shrink-0 text-muted hover:text-foreground transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              {copied === "address" && (
                <p className="mt-1 text-[11px] text-primary">Copied!</p>
              )}
            </div>
            {!isTerminal && (
              <p className="text-[11px] text-muted text-center">
                Checking every 15 seconds...
              </p>
            )}
          </div>
        )}

        {/* Card details (show when delivered) */}
        {order.status === "delivered" && order.card_details && (
          <div className="mt-5 rounded-lg border border-primary/20 bg-primary/[0.04] p-4">
            <p className="text-xs font-medium text-primary mb-2">
              Card Details
            </p>
            <div className="flex flex-col gap-2">
              {Object.entries(order.card_details).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-foreground-secondary capitalize">
                    {key.replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-foreground">
                      {String(val)}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(String(val), key)
                      }
                      className="text-muted hover:text-foreground transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  {copied === key && (
                    <span className="text-[10px] text-primary">Copied</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Failed */}
        {order.status === "failed" && (
          <div className="mt-5 rounded-lg bg-error/[0.06] p-3">
            <p className="text-xs text-error">
              This order failed or expired. No charges were made.
            </p>
          </div>
        )}

        {/* Order meta */}
        <div className="mt-5 flex flex-col gap-1 text-[11px] text-muted">
          <span>Order ID: {order.id}</span>
          <span>
            Created: {new Date(order.created_at).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
