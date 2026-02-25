"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Copy, Check, Loader2, Send } from "lucide-react";

interface WebhookLogEntry {
  id: string;
  url: string;
  status: number;
  success: boolean;
  duration: number;
  createdAt: string;
}

interface WebhookSectionProps {
  currentUrl: string | null;
  webhookSecret: string | null;
  recentLogs: WebhookLogEntry[];
}

export function WebhookSection({
  currentUrl,
  webhookSecret,
  recentLogs,
}: WebhookSectionProps) {
  const [url, setUrl] = useState(currentUrl || "");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [secretVisible, setSecretVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    status: number;
    duration: number;
  } | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/dashboard/webhook", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Webhook saved" });
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({
          type: "error",
          text: data.error || "Failed to save webhook",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/dashboard/webhook/test", {
        method: "POST",
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, status: 0, duration: 0 });
    } finally {
      setTesting(false);
    }
  }

  const copySecret = useCallback(() => {
    if (!webhookSecret) return;
    navigator.clipboard.writeText(webhookSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [webhookSecret]);

  function maskSecret(secret: string) {
    if (secret.length <= 8) return "*".repeat(secret.length);
    return secret.slice(0, 4) + "*".repeat(secret.length - 8) + secret.slice(-4);
  }

  return (
    <section className="rounded-xl border border-border bg-elevated p-6">
      <h2 className="font-heading text-base font-medium mb-4">Webhooks</h2>

      <div className="space-y-4 max-w-lg">
        {/* Webhook URL */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              label="Endpoint URL"
              placeholder="https://your-site.com/api/webhook"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setMessage(null);
              }}
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving || !url}
            className="h-10"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>

        {message && (
          <p
            className={`text-xs ${
              message.type === "success" ? "text-success" : "text-error"
            }`}
          >
            {message.text}
          </p>
        )}

        {/* Signing secret */}
        {webhookSecret && (
          <div>
            <p className="text-sm font-medium text-foreground mb-1.5">
              Signing secret
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-surface p-3">
              <code className="flex-1 font-mono text-xs text-muted break-all select-none">
                {secretVisible ? webhookSecret : maskSecret(webhookSecret)}
              </code>
              <button
                onClick={() => setSecretVisible(!secretVisible)}
                className="shrink-0 rounded-lg p-1.5 text-muted hover:text-foreground transition-colors"
                aria-label={secretVisible ? "Hide secret" : "Reveal secret"}
              >
                {secretVisible ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                onClick={copySecret}
                className="shrink-0 rounded-lg p-1.5 text-muted hover:text-foreground transition-colors"
                aria-label="Copy secret"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        )}

        {/* Test webhook */}
        {currentUrl && (
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {testing ? "Sending..." : "Send test"}
            </Button>

            {testResult && (
              <span
                className={`text-xs font-mono ${
                  testResult.success ? "text-success" : "text-error"
                }`}
              >
                {testResult.success
                  ? `${testResult.status} OK — ${testResult.duration}ms`
                  : testResult.status === 0
                    ? "Connection failed"
                    : `${testResult.status} Error — ${testResult.duration}ms`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Recent delivery logs */}
      {recentLogs.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs font-medium text-foreground-secondary mb-3">
            Recent deliveries
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted">
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Code</th>
                  <th className="pb-2 pr-4 font-medium">Duration</th>
                  <th className="pb-2 font-medium text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${
                          log.success ? "bg-success" : "bg-error"
                        }`}
                      />
                      <span
                        className={`ml-2 ${
                          log.success ? "text-success" : "text-error"
                        }`}
                      >
                        {log.success ? "OK" : "Fail"}
                      </span>
                    </td>
                    <td className="py-2 pr-4 font-mono">
                      {log.status || "ERR"}
                    </td>
                    <td className="py-2 pr-4 font-mono text-muted">
                      {log.duration}ms
                    </td>
                    <td className="py-2 text-right text-muted">
                      {new Date(log.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
