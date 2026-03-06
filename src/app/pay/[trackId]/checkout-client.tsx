"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Check, ExternalLink, Clock, AlertTriangle, Loader2, CircleCheck, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CRYPTO_COLORS } from "@/lib/constants";
import { generateQrSvg } from "@/lib/qr";

// ─── Types ──────────────────────────────────────────────────────

interface PaymentData {
  trackId: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  chain: string | null;
  payCurrency: string | null;
  payAmount: number | null;
  payAddress: string | null;
  network: string | null;
  txId: string | null;
  confirmations: number;
  requiredConfs: number;
  expiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
  returnUrl: string | null;
  metadata: Record<string, unknown> | null;
}

interface StatusResponse {
  status: string;
  confirmations: number;
  requiredConfs: number;
  txId: string | null;
  paidAt: string | null;
}

interface BrandingData {
  logoUrl: string | null;
  brandName: string | null;
  primaryColor: string | null;
  hideNeetpay: boolean;
}

interface CheckoutClientProps {
  payment: PaymentData;
  branding: BrandingData | null;
  cryptoName: string | null;
  explorerTxUrl: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function truncateAddress(address: string, head = 10, tail = 8): string {
  if (address.length <= head + tail + 3) return address;
  return `${address.slice(0, head)}...${address.slice(-tail)}`;
}

const TERMINAL_STATUSES = new Set(["paid", "expired", "failed", "refunded"]);
const POLL_INTERVAL = 5000;

// ─── Component ──────────────────────────────────────────────────

export function CheckoutClient({
  payment: initialPayment,
  branding,
  cryptoName,
  explorerTxUrl,
}: CheckoutClientProps) {
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "1";

  const [status, setStatus] = useState(initialPayment.status);
  const [confirmations, setConfirmations] = useState(initialPayment.confirmations);
  const [requiredConfs, setRequiredConfs] = useState(initialPayment.requiredConfs);
  const [txId, setTxId] = useState(initialPayment.txId);
  const [paidAt, setPaidAt] = useState(initialPayment.paidAt);
  const [copied, setCopied] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Compute initial time remaining ──
  useEffect(() => {
    if (!initialPayment.expiresAt) return;
    const expiresMs = new Date(initialPayment.expiresAt).getTime();
    const nowMs = Date.now();
    const remaining = Math.max(0, Math.floor((expiresMs - nowMs) / 1000));
    setTimeLeft(remaining);
  }, [initialPayment.expiresAt]);

  // ── Countdown timer ──
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

  // ── Embed postMessage ──
  const sentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isEmbed || sentRef.current === status) return;

    if (status === "paid") {
      sentRef.current = status;
      window.parent.postMessage(
        { source: "neetpay", event: "paid", trackId: initialPayment.trackId, status },
        "*",
      );
    } else if (
      status === "expired" ||
      (timeLeft !== null && timeLeft <= 0 && status === "pending")
    ) {
      sentRef.current = "expired";
      window.parent.postMessage(
        { source: "neetpay", event: "expired", trackId: initialPayment.trackId, status: "expired" },
        "*",
      );
    }
  }, [isEmbed, status, timeLeft, initialPayment.trackId]);

  // ── Status polling ──
  const poll = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/v1/payment/${initialPayment.trackId}/status`,
      );
      if (!res.ok) return;
      const json = await res.json();
      const data: StatusResponse = json.data ?? json;

      setStatus(data.status);
      setConfirmations(data.confirmations);
      setRequiredConfs(data.requiredConfs);
      setTxId(data.txId);
      setPaidAt(data.paidAt);

      // Stop polling on terminal status
      if (TERMINAL_STATUSES.has(data.status) && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }

      // Auto-redirect to returnUrl after payment success (3s delay) — skip in embed mode
      if (data.status === "paid" && initialPayment.returnUrl && !isEmbed) {
        setTimeout(() => {
          window.location.href = initialPayment.returnUrl!;
        }, 3000);
      }
    } catch {
      // Silently retry on next interval
    }
  }, [initialPayment.trackId]);

  useEffect(() => {
    if (TERMINAL_STATUSES.has(status)) return;

    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [poll, status]);

  // ── Copy address ──
  const copyAddress = useCallback(async () => {
    if (!initialPayment.payAddress) return;
    try {
      await navigator.clipboard.writeText(initialPayment.payAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  }, [initialPayment.payAddress]);

  // ── Copy amount ──
  const copyAmount = useCallback(async () => {
    if (!initialPayment.payAmount) return;
    try {
      await navigator.clipboard.writeText(initialPayment.payAmount.toString());
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    } catch {
      // Fallback
    }
  }, [initialPayment.payAmount]);

  // ── Generate QR SVG ──
  const qrSvg = useMemo(() => {
    if (!initialPayment.payAddress) return null;

    // Build a URI: for Monero use monero:, BTC use bitcoin:, etc.
    let uri = initialPayment.payAddress;
    const chain = initialPayment.chain;
    const amount = initialPayment.payAmount;

    if (chain === "bitcoin" && amount) {
      uri = `bitcoin:${initialPayment.payAddress}?amount=${amount}`;
    } else if (chain === "monero" && amount) {
      uri = `monero:${initialPayment.payAddress}?tx_amount=${amount}`;
    } else if (chain === "litecoin" && amount) {
      uri = `litecoin:${initialPayment.payAddress}?amount=${amount}`;
    } else if (chain === "dogecoin" && amount) {
      uri = `dogecoin:${initialPayment.payAddress}?amount=${amount}`;
    } else if (chain === "ethereum" && amount) {
      uri = `ethereum:${initialPayment.payAddress}@1?value=${amount}`;
    }

    try {
      return generateQrSvg(uri, 220, "var(--foreground)", "transparent");
    } catch {
      return null;
    }
  }, [initialPayment.payAddress, initialPayment.payAmount, initialPayment.chain]);

  // ── Crypto accent color ──
  const accentColor =
    initialPayment.payCurrency && CRYPTO_COLORS[initialPayment.payCurrency]
      ? CRYPTO_COLORS[initialPayment.payCurrency]
      : "var(--primary)";

  // ── Derived state ──
  const isExpired = status === "expired" || (timeLeft !== null && timeLeft <= 0 && status === "pending");
  const isPaid = status === "paid";
  const isConfirming = status === "confirming";
  const isPending = status === "pending" && !isExpired;
  const isUnderpaid = status === "underpaid";
  const isFailed = status === "failed";

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="w-full max-w-[420px] animate-fade-in">
      {/* Logo / Merchant branding */}
      <div className="mb-6 text-center">
        {branding?.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt={branding.brandName || "Merchant"}
            className="mx-auto h-8 max-w-[160px] object-contain"
          />
        ) : branding?.brandName ? (
          <span
            className="font-heading text-lg font-bold tracking-tight"
            style={branding.primaryColor ? { color: branding.primaryColor } : undefined}
          >
            {branding.brandName}
          </span>
        ) : (
          <a href="/" className="inline-block">
            <span className="font-heading text-lg font-bold tracking-tight">
              <span className="text-foreground">neet</span>
              <span className="text-primary">pay</span>
            </span>
          </a>
        )}
      </div>

      {/* Card */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {/* Status banner for terminal states */}
        {isPaid && (
          <div className="flex items-center justify-center gap-2 bg-success-muted px-4 py-3 animate-slide-down">
            <CircleCheck className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-success">
              Payment complete
            </span>
          </div>
        )}
        {isExpired && (
          <div className="flex items-center justify-center gap-2 bg-warning-muted px-4 py-3 animate-slide-down">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium text-warning">
              Payment expired
            </span>
          </div>
        )}
        {isFailed && (
          <div className="flex items-center justify-center gap-2 bg-error-muted px-4 py-3 animate-slide-down">
            <AlertTriangle className="h-4 w-4 text-error" />
            <span className="text-sm font-medium text-error">
              Payment failed
            </span>
          </div>
        )}
        {isUnderpaid && (
          <div className="flex items-center justify-center gap-2 bg-warning-muted px-4 py-3 animate-slide-down">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium text-warning">
              Underpaid — send the remaining amount
            </span>
          </div>
        )}

        {/* Main content */}
        <div className="p-6">
          {/* Description if available */}
          {initialPayment.description && (
            <p className="mb-4 text-center text-sm text-foreground-secondary">
              {initialPayment.description}
            </p>
          )}

          {/* Amount display */}
          <div className="mb-6 text-center">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">
              Send exactly
            </p>
            {initialPayment.payAmount != null && initialPayment.payCurrency ? (
              <>
                <button
                  type="button"
                  onClick={copyAmount}
                  className="group inline-flex items-center gap-2 transition-colors hover:text-primary"
                  title="Click to copy amount"
                >
                  <span className="font-heading text-3xl font-bold tabular-nums text-foreground">
                    {initialPayment.payAmount}
                  </span>
                  <span
                    className="text-lg font-semibold"
                    style={{ color: accentColor }}
                  >
                    {initialPayment.payCurrency}
                  </span>
                  {copiedAmount ? (
                    <Check className="h-4 w-4 text-success opacity-0 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
                <p className="mt-1 text-sm text-foreground-secondary tabular-nums">
                  {initialPayment.amount} {initialPayment.currency}
                </p>
              </>
            ) : (
              <p className="font-heading text-3xl font-bold tabular-nums text-foreground">
                {initialPayment.amount}{" "}
                <span className="text-lg text-foreground-secondary">
                  {initialPayment.currency}
                </span>
              </p>
            )}
          </div>

          {/* QR Code — only show for active states */}
          {!isPaid && !isExpired && !isFailed && qrSvg && (
            <div className="mb-6 flex justify-center animate-scale-in">
              <div className="rounded-lg border border-border bg-elevated p-3">
                <div
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                  className="[&_svg]:block"
                />
              </div>
            </div>
          )}

          {/* Success checkmark animation (replaces QR) */}
          {isPaid && (
            <div className="mb-6 flex flex-col items-center gap-3 animate-scale-in">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success-muted">
                <CircleCheck className="h-10 w-10 text-success" />
              </div>
              {/* Thank-you message from metadata */}
              {initialPayment.metadata?.thankYouMsg ? (
                <p className="text-sm text-foreground-secondary text-center max-w-[320px]">
                  {String(initialPayment.metadata.thankYouMsg)}
                </p>
              ) : null}
              {/* Redirect notice — hidden in embed mode */}
              {initialPayment.returnUrl && !isEmbed && (
                <p className="text-xs text-muted animate-pulse-subtle">
                  Redirecting...
                </p>
              )}
            </div>
          )}

          {/* Deposit address */}
          {initialPayment.payAddress && !isPaid && (
            <div className="mb-5">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
                Deposit address
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-2.5">
                <span
                  className="min-w-0 flex-1 truncate font-mono text-sm text-foreground select-all"
                  title={initialPayment.payAddress}
                >
                  {initialPayment.payAddress}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyAddress}
                  className="shrink-0 px-2"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {/* Mobile: truncated address shown below full on smaller screens */}
              <p className="mt-1 text-xs text-muted font-mono sm:hidden">
                {truncateAddress(initialPayment.payAddress)}
              </p>
            </div>
          )}

          {/* Timer + Status */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5">
            {/* Timer */}
            <div className="flex items-center gap-2">
              {!TERMINAL_STATUSES.has(status) && timeLeft !== null && (
                <>
                  <Clock className="h-4 w-4 text-muted" />
                  <span
                    className={`font-mono text-sm tabular-nums ${
                      timeLeft <= 120
                        ? "text-warning"
                        : "text-foreground-secondary"
                    }`}
                  >
                    {formatTimeRemaining(timeLeft)}
                  </span>
                </>
              )}
              {isPaid && paidAt && (
                <span className="text-xs text-foreground-secondary">
                  Paid {new Date(paidAt).toLocaleTimeString()}
                </span>
              )}
              {isExpired && (
                <span className="text-xs text-muted">Expired</span>
              )}
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2">
              {isPending && (
                <>
                  <CircleDot className="h-3.5 w-3.5 text-warning animate-pulse-subtle" />
                  <span className="text-xs text-foreground-secondary">
                    Waiting for payment...
                  </span>
                </>
              )}
              {isConfirming && (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-info" />
                  <span className="text-xs text-foreground-secondary">
                    Confirming {confirmations}/{requiredConfs}
                  </span>
                </>
              )}
              {isPaid && (
                <>
                  <CircleCheck className="h-3.5 w-3.5 text-success" />
                  <span className="text-xs text-success font-medium">
                    Complete
                  </span>
                </>
              )}
              {isUnderpaid && (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  <span className="text-xs text-warning">Underpaid</span>
                </>
              )}
            </div>
          </div>

          {/* Block explorer link */}
          {txId && explorerTxUrl && (
            <div className="mt-3 text-center">
              <a
                href={`${explorerTxUrl}${txId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-foreground-secondary transition-colors hover:text-primary"
              >
                <ExternalLink className="h-3 w-3" />
                View on block explorer
              </a>
            </div>
          )}

          {/* Chain / network info */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
            {cryptoName && <span>{cryptoName}</span>}
            {cryptoName && initialPayment.network && (
              <span className="text-border-hover">/</span>
            )}
            {initialPayment.network && <span>{initialPayment.network}</span>}
          </div>
        </div>
      </div>

      {/* Embed close button */}
      {isEmbed && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() =>
              window.parent.postMessage({ source: "neetpay", event: "close" }, "*")
            }
            className="text-xs text-muted hover:text-foreground-secondary transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      )}

      {/* Footer */}
      {!branding?.hideNeetpay && (
        <div className="mt-4 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground-secondary"
          >
            Powered by{" "}
            <span className="font-heading font-semibold">
              <span className="text-foreground-secondary">neet</span>
              <span className="text-primary">pay</span>
            </span>
          </a>
        </div>
      )}
    </div>
  );
}
