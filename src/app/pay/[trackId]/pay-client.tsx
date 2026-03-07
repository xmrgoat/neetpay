"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Check,
  Clock,
  AlertTriangle,
  Loader2,
  CircleCheck,
  ExternalLink,
} from "lucide-react";
import {
  SUPPORTED_CRYPTOS,
  CRYPTO_COLORS,
  INVOICE_STATUS_CONFIG,
  API_URL,
  type InvoiceStatus,
} from "@/lib/constants";
import { CryptoIcon } from "@/components/icons/crypto-icons";
import { generateQrSvg } from "@/lib/qr";

// ─── Types ──────────────────────────────────────────────────────

interface InvoiceData {
  id: string;
  merchant_name: string | null;
  description: string | null;
  amount_xmr: number;
  amount_fiat: number | null;
  fiat_currency: string | null;
  subaddress: string;
  status: string;
  swap_provider: string | null;
  swap_order_id: string | null;
  deposit_address: string | null;
  deposit_chain: string | null;
  deposit_token: string | null;
  deposit_amount: number | null;
  tx_hash: string | null;
  confirmations: number;
  expires_at: string | null;
  created_at: string;
}

interface PayClientProps {
  invoice: InvoiceData | null;
  invoiceId: string;
}

// ─── Helpers ────────────────────────────────────────────────────

const TERMINAL_STATUSES = new Set(["paid", "expired", "failed"]);
const POLL_INTERVAL = 5000;
const REQUIRED_CONFIRMATIONS = 10;

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function truncateAddress(address: string, head = 12, tail = 8): string {
  if (address.length <= head + tail + 3) return address;
  return `${address.slice(0, head)}...${address.slice(-tail)}`;
}

// ─── Status display config ──────────────────────────────────────

const STATUS_DISPLAY: Record<string, { label: string }> = {
  pending: { label: "Waiting for payment..." },
  swap_pending: { label: "Swap in progress..." },
  confirming: { label: "Confirming..." },
  paid: { label: "Payment confirmed!" },
  expired: { label: "Invoice expired" },
  failed: { label: "Payment failed" },
};

// ─── Component ──────────────────────────────────────────────────

export function PayClient({ invoice: initialInvoice, invoiceId }: PayClientProps) {
  // All hooks must be called unconditionally (Rules of Hooks)
  const [invoice, setInvoice] = useState(initialInvoice);
  const [selectedCrypto, setSelectedCrypto] = useState<string>("XMR");
  const [copied, setCopied] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [prevStatus, setPrevStatus] = useState(initialInvoice?.status ?? "pending");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const status = (invoice?.status ?? "pending") as InvoiceStatus;
  const statusChanged = prevStatus !== status;

  // Track status changes for animation
  useEffect(() => {
    if (statusChanged) {
      const t = setTimeout(() => setPrevStatus(status), 500);
      return () => clearTimeout(t);
    }
  }, [status, statusChanged, prevStatus]);

  // ── Timer init ──
  useEffect(() => {
    if (!invoice?.expires_at) return;
    const expiresMs = new Date(invoice.expires_at).getTime();
    const remaining = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
    setTimeLeft(remaining);
  }, [invoice?.expires_at]);

  // ── Countdown ──
  const timerActive = timeLeft !== null && timeLeft > 0 && !TERMINAL_STATUSES.has(status);

  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  // ── Polling ──
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/v1/invoices/${invoiceId}`);
      if (!res.ok) return;
      const json = await res.json();
      const data = json.data ?? json;
      setInvoice(data);

      if (TERMINAL_STATUSES.has(data.status) && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch {
      // Retry on next interval
    }
  }, [invoiceId]);

  useEffect(() => {
    if (TERMINAL_STATUSES.has(status)) return;
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [poll, status]);

  // ── Determine display address and amount ──
  const isDirectXmr = selectedCrypto === "XMR";
  const displayAddress = invoice
    ? isDirectXmr
      ? invoice.subaddress
      : invoice.deposit_address
    : null;
  const displayAmount = invoice
    ? isDirectXmr
      ? invoice.amount_xmr
      : invoice.deposit_amount
    : null;
  const displaySymbol = invoice
    ? isDirectXmr
      ? "XMR"
      : invoice.deposit_token ?? selectedCrypto
    : selectedCrypto;

  // ── QR Code ──
  const qrSvg = useMemo(() => {
    if (!displayAddress) return null;
    let uri = displayAddress;
    if (isDirectXmr && displayAmount) {
      uri = `monero:${displayAddress}?tx_amount=${displayAmount}`;
    }
    try {
      return generateQrSvg(uri, 200, "#ececef", "transparent");
    } catch {
      return null;
    }
  }, [displayAddress, displayAmount, isDirectXmr]);

  // ── Copy handlers ──
  const copyAddress = useCallback(async () => {
    if (!displayAddress) return;
    try {
      await navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [displayAddress]);

  const copyAmount = useCallback(async () => {
    if (!displayAmount) return;
    try {
      await navigator.clipboard.writeText(displayAmount.toString());
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    } catch {}
  }, [displayAmount]);

  // ── Not found (after all hooks) ──
  if (!invoice) {
    return (
      <div className="w-full max-w-[480px] animate-fade-in">
        <Card>
          <div className="p-8 text-center">
            <AlertTriangle className="mx-auto mb-3 h-8 w-8" style={{ color: "#ef4444" }} />
            <h2
              className="font-heading text-lg font-bold mb-1"
              style={{ color: "#ececef" }}
            >
              Invoice not found
            </h2>
            <p className="text-sm" style={{ color: "#737373" }}>
              This invoice does not exist or has been removed.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // ── Derived (invoice guaranteed non-null here) ──
  const isPaid = status === "paid";
  const isExpired = status === "expired" || (timeLeft !== null && timeLeft <= 0 && status === "pending");
  const isFailed = status === "failed";
  const isActive = !isPaid && !isExpired && !isFailed;
  const confirmations = invoice.confirmations ?? 0;
  const statusConfig = INVOICE_STATUS_CONFIG[status] ?? INVOICE_STATUS_CONFIG.pending;

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="w-full max-w-[480px] animate-fade-in">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <span className="font-heading text-lg font-bold tracking-tight">
          <span style={{ color: "#ececef" }}>neet</span>
          <span style={{ color: "#FF6600" }}>pay</span>
        </span>
        <StatusBadge status={status} config={statusConfig} />
      </div>

      {/* Main card */}
      <Card>
        <div className="p-6">
          {/* Merchant description */}
          {invoice.description && (
            <p
              className="mb-4 text-center text-sm"
              style={{ color: "#9d9da8" }}
            >
              {invoice.merchant_name && (
                <span className="font-medium" style={{ color: "#ececef" }}>
                  {invoice.merchant_name}
                  {" — "}
                </span>
              )}
              {invoice.description}
            </p>
          )}

          {/* Amount */}
          <div className="mb-6 text-center">
            <div className="flex items-baseline justify-center gap-2">
              <span
                className="font-heading text-4xl font-bold tabular-nums"
                style={{ color: "#ececef" }}
              >
                {invoice.amount_xmr}
              </span>
              <span
                className="text-xl font-semibold"
                style={{ color: "#FF6600" }}
              >
                XMR
              </span>
            </div>
            {invoice.amount_fiat != null && invoice.fiat_currency && (
              <p
                className="mt-1 text-sm tabular-nums"
                style={{ color: "#737373" }}
              >
                ≈ ${invoice.amount_fiat.toLocaleString("en-US", { minimumFractionDigits: 2 })} {invoice.fiat_currency.toUpperCase()}
              </p>
            )}
          </div>

          {/* Crypto selector — only show when active */}
          {isActive && (
            <div className="mb-6">
              <label
                className="mb-2 block text-xs font-medium uppercase tracking-wider"
                style={{ color: "#737373" }}
              >
                Pay with
              </label>
              <div className="grid grid-cols-4 gap-2">
                {SUPPORTED_CRYPTOS.map((crypto) => {
                  const isSelected = selectedCrypto === crypto.symbol;
                  const color = CRYPTO_COLORS[crypto.symbol] ?? "#FF6600";
                  return (
                    <button
                      key={crypto.symbol}
                      type="button"
                      onClick={() => setSelectedCrypto(crypto.symbol)}
                      className="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 transition-all duration-150 cursor-pointer"
                      style={{
                        backgroundColor: isSelected ? `${color}15` : "transparent",
                        border: `1px solid ${isSelected ? `${color}40` : "#1f1f1f"}`,
                      }}
                    >
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <CryptoIcon symbol={crypto.symbol} size={28} />
                      </div>
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: isSelected ? color : "#9d9da8" }}
                      >
                        {crypto.symbol}
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedCrypto !== "XMR" && (
                <p className="mt-2 text-[11px]" style={{ color: "#56565f" }}>
                  {SUPPORTED_CRYPTOS.find((c) => c.symbol === selectedCrypto)?.name} on{" "}
                  {SUPPORTED_CRYPTOS.find((c) => c.symbol === selectedCrypto)?.chain} via{" "}
                  {SUPPORTED_CRYPTOS.find((c) => c.symbol === selectedCrypto)?.provider}
                </p>
              )}
            </div>
          )}

          {/* QR Code */}
          {isActive && qrSvg && displayAddress && (
            <div className="mb-5 flex justify-center animate-scale-in">
              <div
                className="rounded-lg p-3"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #1f1f1f" }}
              >
                <div
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                  className="[&_svg]:block"
                />
              </div>
            </div>
          )}

          {/* Paid success state */}
          {isPaid && (
            <div className="mb-5 flex flex-col items-center gap-3 animate-scale-in">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(34, 197, 94, 0.12)" }}
              >
                <CircleCheck className="h-10 w-10" style={{ color: "#22c55e" }} />
              </div>
            </div>
          )}

          {/* Deposit address */}
          {isActive && displayAddress && (
            <div className="mb-5">
              <label
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider"
                style={{ color: "#737373" }}
              >
                {isDirectXmr ? "Send to address" : "Deposit address"}
              </label>
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2.5"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #1f1f1f" }}
              >
                <span
                  className="min-w-0 flex-1 font-mono text-xs select-all break-all leading-relaxed"
                  style={{ color: "#ececef" }}
                  title={displayAddress}
                >
                  <span className="hidden sm:inline">{displayAddress}</span>
                  <span className="sm:hidden">{truncateAddress(displayAddress)}</span>
                </span>
                <button
                  type="button"
                  onClick={copyAddress}
                  className="shrink-0 rounded p-1.5 transition-colors cursor-pointer"
                  style={{ color: copied ? "#22c55e" : "#737373" }}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Amount to send (when using swap) */}
          {isActive && !isDirectXmr && displayAmount != null && (
            <div className="mb-5">
              <label
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider"
                style={{ color: "#737373" }}
              >
                Amount to send
              </label>
              <div
                className="flex items-center justify-between rounded-lg px-3 py-2.5"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #1f1f1f" }}
              >
                <span className="font-mono text-sm tabular-nums" style={{ color: "#ececef" }}>
                  {displayAmount} {displaySymbol}
                </span>
                <button
                  type="button"
                  onClick={copyAmount}
                  className="shrink-0 rounded p-1.5 transition-colors cursor-pointer"
                  style={{ color: copiedAmount ? "#22c55e" : "#737373" }}
                >
                  {copiedAmount ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Amount to send (direct XMR) */}
          {isActive && isDirectXmr && (
            <div className="mb-5">
              <label
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider"
                style={{ color: "#737373" }}
              >
                Send exactly
              </label>
              <div
                className="flex items-center justify-between rounded-lg px-3 py-2.5"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #1f1f1f" }}
              >
                <span className="font-mono text-sm tabular-nums" style={{ color: "#ececef" }}>
                  {invoice.amount_xmr} XMR
                </span>
                <button
                  type="button"
                  onClick={copyAmount}
                  className="shrink-0 rounded p-1.5 transition-colors cursor-pointer"
                  style={{ color: copiedAmount ? "#22c55e" : "#737373" }}
                >
                  {copiedAmount ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Tx hash link */}
          {invoice.tx_hash && (
            <div className="mb-5 text-center">
              <a
                href={`https://xmrchain.net/tx/${invoice.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs transition-colors"
                style={{ color: "#9d9da8" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FF6600")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9d9da8")}
              >
                <ExternalLink className="h-3 w-3" />
                View on block explorer
              </a>
            </div>
          )}
        </div>

        {/* Status bar */}
        <StatusBar
          status={status}
          confirmations={confirmations}
          timeLeft={timeLeft}
          isExpired={isExpired}
          statusChanged={statusChanged}
        />
      </Card>

      {/* Footer */}
      <div className="mt-4 text-center">
        <a
          href="https://neetpay.com"
          className="inline-flex items-center gap-1 text-xs transition-colors"
          style={{ color: "#56565f" }}
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{" "}
          <span className="font-heading font-semibold">
            <span style={{ color: "#9d9da8" }}>neet</span>
            <span style={{ color: "#FF6600" }}>pay</span>
          </span>
        </a>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{
        backgroundColor: "#141414",
        border: "1px solid #1f1f1f",
      }}
    >
      {children}
    </div>
  );
}

function StatusBadge({
  status,
  config,
}: {
  status: InvoiceStatus;
  config: { label: string; color: string };
}) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{
        backgroundColor: `${config.color}15`,
        border: `1px solid ${config.color}30`,
      }}
    >
      <div
        className="h-1.5 w-1.5 rounded-full"
        style={{
          backgroundColor: config.color,
          animation:
            status === "pending" || status === "swap_pending" || status === "confirming"
              ? "pulse-subtle 2s ease-in-out infinite"
              : undefined,
        }}
      />
      <span className="text-[11px] font-medium" style={{ color: config.color }}>
        {config.label}
      </span>
    </div>
  );
}

function StatusBar({
  status,
  confirmations,
  timeLeft,
  isExpired,
  statusChanged,
}: {
  status: InvoiceStatus;
  confirmations: number;
  timeLeft: number | null;
  isExpired: boolean;
  statusChanged: boolean;
}) {
  const display = STATUS_DISPLAY[status] ?? STATUS_DISPLAY.pending;
  const statusColor = INVOICE_STATUS_CONFIG[status]?.color ?? "#eab308";

  return (
    <div
      className="flex items-center justify-between px-5 py-3"
      style={{
        borderTop: "1px solid #1f1f1f",
        backgroundColor: "#111111",
        animation: statusChanged ? "fade-in 0.3s ease-out" : undefined,
      }}
    >
      {/* Left: status message */}
      <div className="flex items-center gap-2">
        {status === "pending" && !isExpired && (
          <Clock className="h-3.5 w-3.5 animate-pulse-subtle" style={{ color: "#eab308" }} />
        )}
        {status === "swap_pending" && (
          <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "#f97316" }} />
        )}
        {status === "confirming" && (
          <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "#3b82f6" }} />
        )}
        {status === "paid" && (
          <CircleCheck className="h-3.5 w-3.5" style={{ color: "#22c55e" }} />
        )}
        {(status === "expired" || isExpired) && (
          <AlertTriangle className="h-3.5 w-3.5" style={{ color: "#737373" }} />
        )}
        {status === "failed" && (
          <AlertTriangle className="h-3.5 w-3.5" style={{ color: "#ef4444" }} />
        )}

        <span className="text-xs font-medium" style={{ color: statusColor }}>
          {status === "confirming"
            ? `Confirming... (${confirmations}/${REQUIRED_CONFIRMATIONS} confirmations)`
            : isExpired && status === "pending"
              ? "Invoice expired"
              : display.label}
        </span>
      </div>

      {/* Right: timer */}
      {timeLeft !== null && timeLeft > 0 && !TERMINAL_STATUSES.has(status) && (
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" style={{ color: "#56565f" }} />
          <span
            className="font-mono text-xs tabular-nums"
            style={{
              color: timeLeft <= 120 ? "#eab308" : "#56565f",
            }}
          >
            {formatTimeRemaining(timeLeft)}
          </span>
        </div>
      )}
    </div>
  );
}
