"use client";

import { useCallback, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Link2,
  Plus,
  Copy,
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { SITE_URL } from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface CreatedLink {
  trackId: string;
  url: string;
  amount: number;
  currency: string;
  payCurrency: string;
  description: string | null;
  createdAt: string;
}

const FIAT_CURRENCIES = ["USD", "EUR", "GBP"] as const;

/* -------------------------------------------------------------------------- */
/*  Crypto selector entries — native coins use their symbol as key,           */
/*  multi-chain tokens get a suffix (matches CHAIN_REGISTRY keys)             */
/* -------------------------------------------------------------------------- */

const CRYPTO_OPTIONS: Array<{
  key: string;
  symbol: string;
  label: string;
}> = [
  { key: "XMR", symbol: "XMR", label: "XMR" },
  { key: "BTC", symbol: "BTC", label: "BTC" },
  { key: "ETH", symbol: "ETH", label: "ETH" },
  { key: "SOL", symbol: "SOL", label: "SOL" },
  { key: "TRX", symbol: "TRX", label: "TRX" },
  { key: "BNB", symbol: "BNB", label: "BNB" },
  { key: "MATIC", symbol: "MATIC", label: "MATIC" },
  { key: "USDT-TRC20", symbol: "USDT", label: "USDT (TRC-20)" },
  { key: "USDT-ERC20", symbol: "USDT", label: "USDT (ERC-20)" },
  { key: "USDC-POLYGON", symbol: "USDC", label: "USDC (Polygon)" },
  { key: "USDC-SOL", symbol: "USDC", label: "USDC (Solana)" },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function PaymentLinksContent({ userId }: { userId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  /* ---- Dialog state ---- */
  const [dialogOpen, setDialogOpen] = useState(false);

  /* ---- Form state ---- */
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>("USD");
  const [selectedCrypto, setSelectedCrypto] = useState<string>("XMR");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState("");
  const [returnUrl, setReturnUrl] = useState("");
  const [thankYouMsg, setThankYouMsg] = useState("");

  /* ---- Submission state ---- */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<CreatedLink | null>(null);
  const [copied, setCopied] = useState(false);

  /* ---- Created links history (session-local) ---- */
  const [links, setLinks] = useState<CreatedLink[]>([]);

  /* ---- GSAP entrance animation ---- */
  useGSAP(
    () => {
      if (!containerRef.current) return;
      const els = containerRef.current.querySelectorAll("[data-animate]");
      if (!els.length) return;

      gsap.from(els, {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.06,
        ease: "power3.out",
      });
    },
    { scope: containerRef }
  );

  /* ---- Handlers ---- */

  const resetForm = useCallback(() => {
    setDescription("");
    setAmount("");
    setCurrency("USD");
    setSelectedCrypto("XMR");
    setShowAdvanced(false);
    setCallbackUrl("");
    setReturnUrl("");
    setThankYouMsg("");
    setError(null);
    setCreatedLink(null);
    setCopied(false);
  }, []);

  const openDialog = useCallback(() => {
    resetForm();
    setDialogOpen(true);
  }, [resetForm]);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const handleCreate = useCallback(async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!selectedCrypto) {
      setError("Select a cryptocurrency.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          currency,
          payCurrencyKey: selectedCrypto,
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create payment link.");
        return;
      }

      const link: CreatedLink = {
        trackId: data.trackId,
        url: `${SITE_URL}/pay/${data.trackId}`,
        amount: parsedAmount,
        currency,
        payCurrency: selectedCrypto,
        description: description.trim() || null,
        createdAt: new Date().toISOString(),
      };

      setCreatedLink(link);
      setLinks((prev) => [link, ...prev]);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }, [amount, currency, selectedCrypto, description]);

  const copyLink = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be blocked */
    }
  }, []);

  /* ---- Render ---- */

  return (
    <div ref={containerRef}>
      {/* Create button */}
      <div data-animate>
        <Button onClick={openDialog} size="md">
          <Plus size={16} />
          Create Link
        </Button>
      </div>

      {/* Links list or empty state */}
      <div data-animate className="mt-8">
        {links.length === 0 ? (
          <EmptyState onCreateClick={openDialog} />
        ) : (
          <LinksList links={links} onCopy={copyLink} />
        )}
      </div>

      {/* Create dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={createdLink ? "Link Created" : "Create Payment Link"}
        className="max-w-lg"
      >
        {createdLink ? (
          /* ---- Success view ---- */
          <div className="space-y-5">
            <p className="text-sm text-foreground-secondary">
              Share this link with your customer to collect payment.
            </p>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="break-all font-mono text-sm text-foreground">
                {createdLink.url}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => copyLink(createdLink.url)}
                variant="secondary"
                size="sm"
                className="flex-1"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy Link"}
              </Button>
              <Button
                onClick={() =>
                  window.open(createdLink.url, "_blank", "noopener")
                }
                variant="secondary"
                size="sm"
                className="flex-1"
              >
                <ExternalLink size={14} />
                Open
              </Button>
            </div>

            <div className="border-t border-border pt-4">
              <dl className="grid grid-cols-2 gap-y-2 text-xs">
                <dt className="text-foreground-secondary">Amount</dt>
                <dd className="text-right font-mono text-foreground">
                  {createdLink.amount} {createdLink.currency}
                </dd>
                <dt className="text-foreground-secondary">Crypto</dt>
                <dd className="text-right font-mono text-foreground">
                  {createdLink.payCurrency}
                </dd>
                {createdLink.description && (
                  <>
                    <dt className="text-foreground-secondary">Description</dt>
                    <dd className="text-right text-foreground truncate">
                      {createdLink.description}
                    </dd>
                  </>
                )}
                <dt className="text-foreground-secondary">Track ID</dt>
                <dd className="text-right font-mono text-foreground truncate">
                  {createdLink.trackId}
                </dd>
              </dl>
            </div>

            <Button onClick={closeDialog} variant="secondary" className="w-full">
              Done
            </Button>
          </div>
        ) : (
          /* ---- Creation form ---- */
          <div className="space-y-5">
            {/* Description */}
            <div className="space-y-1.5">
              <label
                htmlFor="link-desc"
                className="block text-xs font-medium text-foreground-secondary"
              >
                Description
              </label>
              <Input
                id="link-desc"
                placeholder="e.g. Invoice #1042"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Amount + Currency */}
            <div className="space-y-1.5">
              <label
                htmlFor="link-amount"
                className="block text-xs font-medium text-foreground-secondary"
              >
                Amount
              </label>
              <div className="flex gap-2">
                <Input
                  id="link-amount"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background"
                >
                  {FIAT_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Crypto selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground-secondary">
                Pay with
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CRYPTO_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setSelectedCrypto(opt.key)}
                    className={cn(
                      "h-8 rounded-lg border text-xs font-medium transition-colors",
                      selectedCrypto === opt.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface text-foreground-secondary hover:text-foreground hover:bg-elevated"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced options */}
            <div className="border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex w-full items-center justify-between text-xs font-medium text-foreground-secondary hover:text-foreground transition-colors"
              >
                <span>Advanced Options</span>
                <ChevronDown
                  size={14}
                  className={cn(
                    "transition-transform duration-200",
                    showAdvanced && "rotate-180"
                  )}
                />
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="link-callback"
                      className="block text-xs font-medium text-foreground-secondary"
                    >
                      Callback URL
                    </label>
                    <Input
                      id="link-callback"
                      type="url"
                      placeholder="https://yoursite.com/api/callback"
                      value={callbackUrl}
                      onChange={(e) => setCallbackUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="link-return"
                      className="block text-xs font-medium text-foreground-secondary"
                    >
                      Return URL
                    </label>
                    <Input
                      id="link-return"
                      type="url"
                      placeholder="https://yoursite.com/thank-you"
                      value={returnUrl}
                      onChange={(e) => setReturnUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="link-thanks"
                      className="block text-xs font-medium text-foreground-secondary"
                    >
                      Thank You Message
                    </label>
                    <textarea
                      id="link-thanks"
                      rows={2}
                      placeholder="Payment received. Thank you!"
                      value={thankYouMsg}
                      onChange={(e) => setThankYouMsg(e.target.value)}
                      className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-secondary/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-error">{error}</p>
            )}

            {/* Submit */}
            <Button
              onClick={handleCreate}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Link2 size={16} />
                  Generate Payment Link
                </>
              )}
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Empty state                                                                */
/* -------------------------------------------------------------------------- */

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface py-20">
      <Link2 size={48} className="text-foreground-secondary opacity-30" />
      <p className="mt-4 font-heading text-sm font-medium text-foreground">
        No payment links yet
      </p>
      <p className="mt-1 max-w-xs text-center text-xs text-foreground-secondary">
        Create your first payment link to start accepting crypto payments.
      </p>
      <Button onClick={onCreateClick} variant="secondary" size="sm" className="mt-6">
        <Plus size={14} />
        Create your first link
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Links list                                                                 */
/* -------------------------------------------------------------------------- */

function LinksList({
  links,
  onCopy,
}: {
  links: CreatedLink[];
  onCopy: (url: string) => void;
}) {
  return (
    <div className="space-y-3">
      {links.map((link) => (
        <div
          key={link.trackId}
          className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-5 py-4"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {link.description || "Untitled"}
            </p>
            <p className="mt-0.5 font-mono text-xs text-foreground-secondary truncate">
              {link.url}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="font-mono text-xs text-foreground-secondary">
              {link.amount} {link.currency}
            </span>
            <span className="rounded-md border border-border bg-elevated px-2 py-0.5 text-xs font-medium text-foreground-secondary">
              {link.payCurrency}
            </span>
            <button
              onClick={() => onCopy(link.url)}
              className="rounded-lg p-1.5 text-foreground-secondary hover:text-foreground hover:bg-elevated transition-colors"
              aria-label="Copy link"
            >
              <Copy size={14} />
            </button>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-1.5 text-foreground-secondary hover:text-foreground hover:bg-elevated transition-colors"
              aria-label="Open link"
            >
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
