"use client";

import { useCallback, useRef, useState, useMemo } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Link2,
  Plus,
  Copy,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Search,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { SITE_URL, INVOICE_STATUS_CONFIG } from "@/lib/constants";
import type { InvoiceStatus } from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface CreatedLink {
  trackId: string;
  url: string;
  amount: number;
  currency: string;
  payCurrency: string;
  description: string | null;
  status: string;
  createdAt: string;
}

const FIAT_CURRENCIES = ["USD", "EUR", "GBP"] as const;

/* -------------------------------------------------------------------------- */
/*  Crypto selector entries — complete list matching CHAIN_REGISTRY           */
/* -------------------------------------------------------------------------- */

const CRYPTO_OPTIONS: Array<{
  key: string;
  symbol: string;
  label: string;
  group: "native" | "stablecoin";
}> = [
  // Native coins
  { key: "XMR", symbol: "XMR", label: "XMR", group: "native" },
  { key: "BTC", symbol: "BTC", label: "BTC", group: "native" },
  { key: "ETH", symbol: "ETH", label: "ETH", group: "native" },
  { key: "SOL", symbol: "SOL", label: "SOL", group: "native" },
  { key: "TRX", symbol: "TRX", label: "TRX", group: "native" },
  { key: "BNB", symbol: "BNB", label: "BNB", group: "native" },
  { key: "MATIC", symbol: "MATIC", label: "MATIC", group: "native" },
  { key: "LTC", symbol: "LTC", label: "LTC", group: "native" },
  { key: "DOGE", symbol: "DOGE", label: "DOGE", group: "native" },
  { key: "ARB", symbol: "ARB", label: "ARB", group: "native" },
  { key: "OP", symbol: "OP", label: "OP", group: "native" },
  { key: "AVAX", symbol: "AVAX", label: "AVAX", group: "native" },
  // USDT multi-chain
  { key: "USDT-TRC20", symbol: "USDT", label: "USDT (TRC-20)", group: "stablecoin" },
  { key: "USDT-ERC20", symbol: "USDT", label: "USDT (ERC-20)", group: "stablecoin" },
  { key: "USDT-POLYGON", symbol: "USDT", label: "USDT (Polygon)", group: "stablecoin" },
  { key: "USDT-BSC", symbol: "USDT", label: "USDT (BSC)", group: "stablecoin" },
  { key: "USDT-SOL", symbol: "USDT", label: "USDT (Solana)", group: "stablecoin" },
  // USDC multi-chain
  { key: "USDC-ERC20", symbol: "USDC", label: "USDC (ERC-20)", group: "stablecoin" },
  { key: "USDC-POLYGON", symbol: "USDC", label: "USDC (Polygon)", group: "stablecoin" },
  { key: "USDC-BSC", symbol: "USDC", label: "USDC (BSC)", group: "stablecoin" },
  { key: "USDC-SOL", symbol: "USDC", label: "USDC (Solana)", group: "stablecoin" },
  // DAI
  { key: "DAI-ERC20", symbol: "DAI", label: "DAI (ERC-20)", group: "stablecoin" },
];

const ITEMS_PER_PAGE = 10;

const STATUS_FILTERS = ["all", "pending", "confirming", "paid", "expired", "failed"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function PaymentLinksContent({
  userId,
  initialLinks = [],
}: {
  userId: string;
  initialLinks?: CreatedLink[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  /* ---- Dialog state ---- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CreatedLink | null>(null);

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

  /* ---- Created links history (pre-loaded from DB + session additions) ---- */
  const [links, setLinks] = useState<CreatedLink[]>(initialLinks);

  /* ---- List controls ---- */
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  /* ---- Filtered + paginated links ---- */
  const filteredLinks = useMemo(() => {
    let result = links;

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }

    // Search filter (description, trackId, payCurrency)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (l) =>
          (l.description?.toLowerCase().includes(q)) ||
          l.trackId.toLowerCase().includes(q) ||
          l.payCurrency.toLowerCase().includes(q) ||
          l.currency.toLowerCase().includes(q)
      );
    }

    return result;
  }, [links, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredLinks.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedLinks = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredLinks.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLinks, safeCurrentPage]);

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
          ...(callbackUrl.trim() && { callbackUrl: callbackUrl.trim() }),
          ...(returnUrl.trim() && { returnUrl: returnUrl.trim() }),
          ...(thankYouMsg.trim() && { metadata: { thankYouMsg: thankYouMsg.trim() } }),
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
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      setCreatedLink(link);
      setLinks((prev) => [link, ...prev]);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }, [amount, currency, selectedCrypto, description, callbackUrl, returnUrl, thankYouMsg]);

  const copyLink = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be blocked */
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/dashboard/links");
      if (res.ok) {
        const data: CreatedLink[] = await res.json();
        setLinks(data);
      }
    } catch {
      // silently fail — keep existing data
    } finally {
      setRefreshing(false);
    }
  }, []);

  const confirmDelete = useCallback((link: CreatedLink) => {
    setDeleteTarget(link);
    setDeleteDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/dashboard/links/${deleteTarget.trackId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLinks((prev) => prev.filter((l) => l.trackId !== deleteTarget.trackId));
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

  /* ---- Render ---- */

  return (
    <div ref={containerRef}>
      {/* Top bar: Create + Refresh */}
      <div data-animate className="flex items-center gap-3">
        <Button onClick={openDialog} size="md">
          <Plus size={16} />
          Create Link
        </Button>
        {links.length > 0 && (
          <Button
            onClick={handleRefresh}
            variant="secondary"
            size="md"
            disabled={refreshing}
          >
            <RefreshCw
              size={14}
              className={cn(refreshing && "animate-spin")}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        )}
      </div>

      {/* Links list or empty state */}
      <div data-animate className="mt-6">
        {links.length === 0 ? (
          <EmptyState onCreateClick={openDialog} />
        ) : (
          <>
            {/* Search + Filter bar */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-xs flex-1">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  type="text"
                  placeholder="Search links..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="flex h-8 w-full rounded-lg border border-border bg-surface pl-8 pr-8 text-xs text-foreground placeholder:text-muted transition-all duration-150 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatusFilter(s);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors capitalize",
                      statusFilter === s
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-foreground-secondary hover:text-foreground hover:bg-surface border border-transparent"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Results count */}
            <p className="mb-3 text-[11px] text-muted">
              {filteredLinks.length} {filteredLinks.length === 1 ? "link" : "links"}
              {statusFilter !== "all" && ` (${statusFilter})`}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>

            {/* Links */}
            {paginatedLinks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface py-12">
                <Search size={32} className="text-foreground-secondary opacity-30" />
                <p className="mt-3 text-sm text-foreground-secondary">
                  No links match your filters.
                </p>
              </div>
            ) : (
              <LinksList
                links={paginatedLinks}
                onCopy={copyLink}
                onDelete={confirmDelete}
              />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-[11px] text-muted">
                  Page {safeCurrentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} />
                    Prev
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </>
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
                  className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 focus:ring-offset-background"
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

              {/* Native coins */}
              <p className="text-[10px] uppercase tracking-wider text-muted font-medium mt-2 mb-1">
                Native Coins
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {CRYPTO_OPTIONS.filter((o) => o.group === "native").map((opt) => (
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

              {/* Stablecoins */}
              <p className="text-[10px] uppercase tracking-wider text-muted font-medium mt-3 mb-1">
                Stablecoins
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {CRYPTO_OPTIONS.filter((o) => o.group === "stablecoin").map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setSelectedCrypto(opt.key)}
                    className={cn(
                      "h-8 rounded-lg border text-[11px] font-medium transition-colors",
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
                    <p className="text-[10px] text-muted">
                      Receives a POST when payment status changes.
                    </p>
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
                    <p className="text-[10px] text-muted">
                      Customer is redirected here after payment.
                    </p>
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
                      className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-secondary/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 focus:ring-offset-background resize-none"
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

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteTarget(null);
        }}
        title="Delete Payment Link"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground-secondary">
            Are you sure you want to delete this payment link? This action cannot be undone.
          </p>
          {deleteTarget && (
            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="text-xs font-medium text-foreground truncate">
                {deleteTarget.description || "Untitled"}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-muted truncate">
                {deleteTarget.trackId}
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="flex-1"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  Delete
                </>
              )}
            </Button>
          </div>
        </div>
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
/*  Status badge                                                               */
/* -------------------------------------------------------------------------- */

function StatusBadge({ status }: { status: string }) {
  const config = INVOICE_STATUS_CONFIG[status as InvoiceStatus];
  if (!config) {
    return (
      <span className="rounded-md bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase text-foreground-secondary">
        {status}
      </span>
    );
  }

  return (
    <span
      className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase"
      style={{
        backgroundColor: `${config.color}15`,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Links list                                                                 */
/* -------------------------------------------------------------------------- */

function LinksList({
  links,
  onCopy,
  onDelete,
}: {
  links: CreatedLink[];
  onCopy: (url: string) => void;
  onDelete: (link: CreatedLink) => void;
}) {
  return (
    <div className="space-y-2">
      {links.map((link) => (
        <div
          key={link.trackId}
          className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-5 py-3.5 transition-colors hover:bg-elevated/50"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground truncate">
                {link.description || "Untitled"}
              </p>
              <StatusBadge status={link.status} />
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-muted truncate">
              {link.url}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="font-mono text-xs text-foreground-secondary">
              {link.amount} {link.currency}
            </span>
            <span className="rounded-md border border-border bg-elevated px-2 py-0.5 text-[11px] font-medium text-foreground-secondary">
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
            <button
              onClick={() => onDelete(link)}
              className="rounded-lg p-1.5 text-foreground-secondary hover:text-error hover:bg-error/10 transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Delete link"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
