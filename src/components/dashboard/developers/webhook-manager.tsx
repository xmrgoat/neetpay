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
} from "lucide-react";

const WEBHOOK_EVENTS = [
  { name: "payment.created", description: "A new payment invoice was created" },
  { name: "payment.confirming", description: "Payment detected, awaiting confirmations" },
  { name: "payment.paid", description: "Payment fully confirmed and completed" },
  { name: "payment.expired", description: "Payment invoice expired without payment" },
  { name: "payment.failed", description: "Payment failed or was rejected" },
] as const;

interface WebhookLogEntry {
  id: string;
  url: string;
  status: number;
  success: boolean;
  duration: number;
  createdAt: string;
}

interface WebhookManagerProps {
  currentUrl: string | null;
  webhookSecret: string | null;
  initialLogs: WebhookLogEntry[];
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
              <p className="mt-0.5 text-xs text-foreground-muted">
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
            <p className="text-xs text-foreground-muted py-4 text-center">
              No webhook deliveries yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {logs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                        log.success ? "bg-success" : "bg-error"
                      }`}
                    />
                    <span className="font-mono text-xs text-foreground">
                      {log.status || "ERR"}
                    </span>
                    <span className="text-xs text-foreground-muted font-mono">
                      {log.duration}ms
                    </span>
                  </div>
                  <span className="text-xs text-foreground-secondary">
                    {new Date(log.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
