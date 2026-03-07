"use client";

import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/constants";
import { OrderStatus } from "./OrderStatus";

const CRYPTO_OPTIONS = [
  { ticker: "XMR", network: "Monero", label: "Monero (XMR)" },
  { ticker: "BTC", network: "Bitcoin", label: "Bitcoin (BTC)" },
  { ticker: "ETH", network: "Arbitrum", label: "Ethereum (ETH)" },
  { ticker: "USDC", network: "Arbitrum", label: "USDC" },
  { ticker: "USDT", network: "Arbitrum", label: "USDT" },
  { ticker: "SOL", network: "Solana", label: "Solana (SOL)" },
  { ticker: "TRX", network: "Tron", label: "Tron (TRX)" },
  { ticker: "BNB", network: "BSC", label: "BNB" },
];

interface OrderFormProps {
  type: "prepaid" | "giftcard";
  provider?: string;
  currencyCode?: string;
  productId?: string;
  name: string;
  onBack: () => void;
}

export function OrderForm({
  type,
  provider,
  currencyCode,
  productId,
  name,
  onBack,
}: OrderFormProps) {
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [cryptoIdx, setCryptoIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);

  const selectedCrypto = CRYPTO_OPTIONS[cryptoIdx];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!email.includes("@")) {
      setError("Enter a valid email.");
      return;
    }

    setSubmitting(true);

    try {
      const endpoint =
        type === "prepaid" ? "/v1/cards/order" : "/v1/giftcards/order";

      const body =
        type === "prepaid"
          ? {
              provider,
              currency_code: currencyCode,
              amount: amountNum,
              ticker_from: selectedCrypto.ticker,
              network_from: selectedCrypto.network,
              email,
            }
          : {
              product_id: productId,
              amount: amountNum,
              ticker_from: selectedCrypto.ticker,
              network_from: selectedCrypto.network,
              email,
            };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": localStorage.getItem("api_key") || "",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create order");
      }

      const data = await res.json();
      setOrderId(data.order_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (orderId) {
    return <OrderStatus orderId={orderId} onBack={onBack} />;
  }

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
        <h2 className="font-heading text-lg font-semibold">{name}</h2>
        <p className="mt-1 text-xs text-foreground-secondary">
          {type === "prepaid" ? "Prepaid card" : "Gift card"} &middot; Pay with
          crypto
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {/* Amount */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground-secondary">
              Amount ({currencyCode || "USD"})
            </span>
            <input
              type="number"
              step="0.01"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50.00"
              className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              required
            />
          </label>

          {/* Crypto */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground-secondary">
              Pay with
            </span>
            <select
              value={cryptoIdx}
              onChange={(e) => setCryptoIdx(Number(e.target.value))}
              className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              {CRYPTO_OPTIONS.map((opt, i) => (
                <option key={opt.ticker} value={i}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {/* Email */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground-secondary">
              Delivery email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              required
            />
            <span className="text-[11px] text-muted">
              Deleted from our servers after delivery.
            </span>
          </label>

          {error && (
            <p className="text-xs text-error">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Creating order..." : "Order now"}
          </button>
        </form>
      </div>
    </div>
  );
}
