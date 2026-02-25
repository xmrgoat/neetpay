"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Copy, Check, Trash2, Loader2 } from "lucide-react";

interface MaskedKey {
  id: string;
  name: string;
  maskedKey: string;
  lastUsed: string | null;
  createdAt: string;
}

interface ApiKeysSectionProps {
  keys: MaskedKey[];
}

export function ApiKeysSection({ keys }: ApiKeysSectionProps) {
  const router = useRouter();
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaskedKey | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/dashboard/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setRevealedKey(data.key);
        setNewKeyName("");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create key");
      }
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/dashboard/api-keys/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      }
    } catch {
      // Silent fail — key stays in list
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <section className="rounded-xl border border-border bg-elevated p-6">
      <h2 className="font-heading text-base font-medium mb-4">API Keys</h2>

      {/* Create new key */}
      <div className="flex gap-2 items-end max-w-md mb-6">
        <div className="flex-1">
          <Input
            label="New key name"
            value={newKeyName}
            onChange={(e) => {
              setNewKeyName(e.target.value);
              setError(null);
            }}
            placeholder="e.g. Production"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleCreate}
          disabled={creating || !newKeyName.trim()}
          className="h-10"
        >
          {creating && <Loader2 size={14} className="animate-spin" />}
          {creating ? "Creating..." : "Generate"}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-error mb-4">{error}</p>
      )}

      {/* Newly created key — show once */}
      {revealedKey && (
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs font-medium text-primary mb-2">
            Copy this key now. It won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-surface px-3 py-2 font-mono text-xs text-foreground break-all select-all">
              {revealedKey}
            </code>
            <button
              onClick={() => copyToClipboard(revealedKey)}
              className="shrink-0 rounded-lg p-2 text-foreground-secondary hover:text-foreground hover:bg-surface transition-colors"
              aria-label="Copy key"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <button
            onClick={() => setRevealedKey(null)}
            className="mt-2 text-xs text-foreground-secondary hover:text-foreground transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Key list */}
      <div className="divide-y divide-border">
        {keys.length === 0 ? (
          <p className="text-sm text-muted py-8 text-center">
            No API keys yet. Create one to get started.
          </p>
        ) : (
          keys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{k.name}</p>
                <p className="mt-0.5 font-mono text-xs text-muted truncate">
                  {k.maskedKey}
                </p>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-muted">
                  <span>
                    Created{" "}
                    {new Date(k.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  {k.lastUsed && (
                    <span>
                      Last used{" "}
                      {new Date(k.lastUsed).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setDeleteTarget(k)}
                className="shrink-0 rounded-lg p-2 text-muted hover:text-error hover:bg-error/10 transition-colors"
                aria-label={`Delete ${k.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete API key"
      >
        <p className="text-sm text-foreground-secondary mb-1">
          Are you sure you want to delete{" "}
          <span className="font-medium text-foreground">
            {deleteTarget?.name}
          </span>
          ?
        </p>
        <p className="text-xs text-muted mb-6">
          Any integrations using this key will stop working immediately. This
          action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(null)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="bg-error hover:bg-error/90 text-white"
          >
            {deleting && <Loader2 size={14} className="animate-spin" />}
            {deleting ? "Deleting..." : "Delete key"}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
