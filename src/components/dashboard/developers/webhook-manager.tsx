"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Send,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Clock,
  AlertTriangle,
} from "lucide-react";

const WEBHOOK_EVENTS = [
  { name: "payment.created", description: "A new payment invoice was created" },
  { name: "payment.confirming", description: "Payment detected, awaiting confirmations" },
  { name: "payment.paid", description: "Payment fully confirmed and completed" },
  { name: "payment.underpaid", description: "Payment received but amount is below expected" },
  { name: "payment.expired", description: "Payment invoice expired without payment" },
  { name: "payment.failed", description: "Payment failed or was rejected" },
] as const;

const MAX_RETRIES = 5;

interface WebhookLogEntry {
  id: string;
  url: string;
  payload: string;
  status: number;
  success: boolean;
  duration: number;
  retryCount: number;
  nextRetryAt: string | null;
  paymentId: string | null;
  createdAt: string;
}

interface WebhookManagerProps {
  currentUrl: string | null;
  webhookSecret: string | null;
  initialLogs: WebhookLogEntry[];
}

function getRetryStatus(log: WebhookLogEntry): {
  label: string;
  className: string;
} {
  if (log.success) {
    if (log.retryCount > 0) {
      return {
        label: `Delivered (retry ${log.retryCount})`,
        className: "text-success",
      };
    }
    return { label: "Delivered", className: "text-success" };
  }

  if (log.retryCount >= MAX_RETRIES) {
    return { label: "Failed (retries exhausted)", className: "text-error" };
  }

  if (log.nextRetryAt) {
    return {
      label: `Retry ${log.retryCount}/${MAX_RETRIES} scheduled`,
      className: "text-warning",
    };
  }

  if (log.retryCount === 0) {
    return { label: "Failed (retry pending)", className: "text-warning" };
  }

  return {
    label: `Failed (${log.retryCount}/${MAX_RETRIES})`,
    className: "text-error",
  };
}

function formatPayload(payload: string): string {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}

function getEventFromPayload(payload: string): string | null {
  try {
    const parsed = JSON.parse(payload);
    return parsed.event ?? null;
  } catch {
    return null;
  }
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = then - now;

  if (diffMs <= 0) return "now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function WebhookManager({
  currentUrl,
  webhookSecret,
  initialLogs,
}: WebhookManagerProps) {
  const [url, setUrl] = useState(currentUrl || "");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    status: number;
    duration: number;
  } | null>(null);
  const [secretVisible, setSecretVisible] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [logs, setLogs] = useState<WebhookLogEntry[]>(initialLogs);
  const [refreshingLogs, setRefreshingLogs] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const copySecret = useCallback(async () => {
    if (!webhookSecret) return;
    await navigator.clipboard.writeText(webhookSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  }, [webhookSecret]);

  async function saveWebhook() {
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/dashboard/webhook", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (res.ok) setSaveSuccess(true);
    } finally {
      setSaving(false);
    }
  }

  async function testWebhook() {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/dashboard/webhook/test", {
        method: "POST",
      });

      const data = await res.json();
      setTestResult(data);
      // Refresh logs after test
      await fetchLogs();
    } finally {
      setTesting(false);
    }
  }

  async function fetchLogs() {
    setRefreshingLogs(true);
    try {
      const res = await fetch("/api/dashboard/webhook/logs");
      if (res.ok) {
        setLogs(await res.json());
      }
    } finally {
      setRefreshingLogs(false);
    }
  }

  // Clear save success after timeout
  useEffect(() => {
    if (!saveSuccess) return;
    const t = setTimeout(() => setSaveSuccess(false), 3000);
    return () => clearTimeout(t);
  }, [saveSuccess]);

  const maskedSecret = webhookSecret
    ? `whsec_${"*".repeat(28)}${webhookSecret.slice(-4)}`
    : null;

  return (
    <section className="rounded-xl border border-border bg-elevated p-6">
      <div className="mb-1">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Webhooks
        </h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          Receive real-time notifications when payment events occur. We sign
          every payload with your webhook secret using HMAC-SHA256.
        </p>
      </div>

      {/* URL + Save */}
      <div className="mt-5 space-y-4 max-w-lg">
        <Input
          label="Endpoint URL"
          placeholder="https://your-site.com/api/webhook"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setSaveSuccess(false);
          }}
        />

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={saveWebhook}
            disabled={saving || !url}
          >
            {saving ? "Saving..." : "Save endpoint"}
          </Button>
          {currentUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={testWebhook}
              disabled={testing}
            >
              <Send size={14} />
              {testing ? "Sending..." : "Send test"}
            </Button>
          )}
          {saveSuccess && (
            <span className="text-xs font-mono text-success">Saved</span>
          )}
        </div>

        {/* Test result */}
        {testResult && (
          <div className="rounded-lg border border-border bg-surface px-4 py-3">
            {testResult.success ? (
              <p className="text-xs font-mono text-success">
                {testResult.status} OK &mdash; {testResult.duration}ms
              </p>
            ) : (
              <p className="text-xs font-mono text-error">
                {testResult.status === 0
                  ? "Connection failed"
                  : `${testResult.status} Error — ${testResult.duration}ms`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Signing secret */}
      {webhookSecret && (
        <div className="mt-6 max-w-lg">
          <p className="text-xs font-medium text-foreground-secondary mb-2">
            Signing secret
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground-secondary truncate">
              {secretVisible ? webhookSecret : maskedSecret}
            </code>
            <button
              onClick={() => setSecretVisible(!secretVisible)}
              className="shrink-0 rounded-lg p-2 text-foreground-secondary hover:text-foreground hover:bg-surface transition-colors"
              aria-label={secretVisible ? "Hide secret" : "Reveal secret"}
            >
              {secretVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button
              onClick={copySecret}
              className="shrink-0 rounded-lg p-2 text-foreground-secondary hover:text-foreground hover:bg-surface transition-colors"
              aria-label={copiedSecret ? "Copied" : "Copy secret"}
            >
              {copiedSecret ? (
                <Check size={14} className="text-success" />
              ) : (
                <Copy size={14} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Supported events */}
      <div className="mt-6 pt-6 border-t border-border">
        <h3 className="text-xs font-medium uppercase tracking-widest text-foreground-secondary mb-3">
          Supported Events
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {WEBHOOK_EVENTS.map((evt) => (
            <div
              key={evt.name}
              className="rounded-lg border border-border bg-surface px-3 py-2.5"
            >
              <p className="font-mono text-xs text-primary">{evt.name}</p>
              <p className="mt-0.5 text-xs text-muted">
                {evt.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent deliveries */}
      {currentUrl && (
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium uppercase tracking-widest text-foreground-secondary">
              Recent Deliveries
            </h3>
            <button
              onClick={fetchLogs}
              disabled={refreshingLogs}
              className="text-foreground-secondary hover:text-foreground transition-colors"
              aria-label="Refresh logs"
            >
              <RefreshCw
                size={13}
                className={refreshingLogs ? "animate-spin" : ""}
              />
            </button>
          </div>

          {logs.length === 0 ? (
            <p className="text-xs text-muted py-4 text-center">
              No webhook deliveries yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {logs.slice(0, 20).map((log) => {
                const retryStatus = getRetryStatus(log);
                const event = getEventFromPayload(log.payload);
                const isExpanded = expandedLogId === log.id;

                return (
                  <div key={log.id}>
                    {/* Log row */}
                    <button
                      onClick={() =>
                        setExpandedLogId(isExpanded ? null : log.id)
                      }
                      className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 hover:bg-elevated/50 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Expand chevron */}
                          {isExpanded ? (
                            <ChevronDown
                              size={12}
                              className="shrink-0 text-foreground-secondary"
                            />
                          ) : (
                            <ChevronRight
                              size={12}
                              className="shrink-0 text-foreground-secondary"
                            />
                          )}

                          {/* Status dot */}
                          <span
                            className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                              log.success ? "bg-success" : "bg-error"
                            }`}
                          />

                          {/* HTTP status */}
                          <span className="font-mono text-xs text-foreground shrink-0">
                            {log.status || "ERR"}
                          </span>

                          {/* Duration */}
                          <span className="text-xs text-muted font-mono shrink-0">
                            {log.duration}ms
                          </span>

                          {/* Event name */}
                          {event && (
                            <span className="font-mono text-[11px] text-primary truncate">
                              {event}
                            </span>
                          )}

                          {/* Retry indicator */}
                          {!log.success && log.retryCount > 0 && (
                            <span className="flex items-center gap-1 shrink-0">
                              <RotateCcw size={10} className="text-warning" />
                              <span className="text-[10px] font-mono text-warning">
                                {log.retryCount}/{MAX_RETRIES}
                              </span>
                            </span>
                          )}

                          {/* Pending retry indicator */}
                          {!log.success &&
                            log.retryCount < MAX_RETRIES &&
                            log.nextRetryAt && (
                              <span className="flex items-center gap-1 shrink-0">
                                <Clock
                                  size={10}
                                  className="text-muted"
                                />
                                <span className="text-[10px] font-mono text-muted">
                                  {formatRelativeTime(log.nextRetryAt)}
                                </span>
                              </span>
                            )}

                          {/* Exhausted indicator */}
                          {!log.success && log.retryCount >= MAX_RETRIES && (
                            <span className="flex items-center gap-1 shrink-0">
                              <AlertTriangle
                                size={10}
                                className="text-error"
                              />
                              <span className="text-[10px] font-mono text-error">
                                exhausted
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Timestamp */}
                        <span className="text-xs text-foreground-secondary shrink-0">
                          {new Date(log.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="ml-4 mt-1 mb-2 rounded-lg border border-border bg-surface overflow-hidden">
                        {/* Retry status bar */}
                        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-mono ${retryStatus.className}`}
                            >
                              {retryStatus.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted">
                            {log.paymentId && (
                              <span className="font-mono">
                                {log.paymentId.slice(0, 12)}...
                              </span>
                            )}
                            <span className="font-mono">{log.duration}ms</span>
                          </div>
                        </div>

                        {/* Payload preview */}
                        <div className="px-4 py-3">
                          <p className="text-[10px] font-medium uppercase tracking-widest text-foreground-secondary mb-2">
                            Payload
                          </p>
                          <pre className="rounded-lg bg-background border border-border p-3 overflow-x-auto max-h-48 overflow-y-auto">
                            <code className="font-mono text-[11px] text-foreground-secondary leading-relaxed whitespace-pre">
                              {formatPayload(log.payload)}
                            </code>
                          </pre>
                        </div>

                        {/* Next retry info */}
                        {!log.success &&
                          log.nextRetryAt &&
                          log.retryCount < MAX_RETRIES && (
                            <div className="px-4 py-2.5 border-t border-border">
                              <p className="text-xs text-muted">
                                Next retry in{" "}
                                <span className="font-mono text-foreground-secondary">
                                  {formatRelativeTime(log.nextRetryAt)}
                                </span>{" "}
                                (attempt {log.retryCount + 1} of {MAX_RETRIES})
                              </p>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
