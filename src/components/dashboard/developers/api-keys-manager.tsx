"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Copy, Check, Plus, Trash2, Key } from "lucide-react";

interface MaskedKey {
  id: string;
  name: string;
  maskedKey: string;
  lastUsed: string | null;
  createdAt: string;
}

interface ApiKeysManagerProps {
  keys: MaskedKey[];
}

export function ApiKeysManager({ keys }: ApiKeysManagerProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaskedKey | null>(null);
  const [deleting, setDeleting] = useState(false);

  const copyToClipboard = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }, []);

  async function createKey() {
    if (creating) return;
    setCreating(true);

    try {
      const res = await fetch("/api/dashboard/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName || "Default" }),
      });

      if (res.ok) {
        const data = await res.json();
        setRevealedKey(data.key);
        setNewKeyName("");
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  }

  async function deleteKey() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/dashboard/api-keys/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      }
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <section className="rounded-xl border border-border bg-elevated p-6">
        <div className="mb-1">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            API Keys
          </h2>
          <p className="mt-1 text-sm text-foreground-secondary">
            Use API keys to authenticate requests to the neetpay API. Include
            your key in the{" "}
            <code className="font-mono text-xs text-primary">
              Authorization
            </code>{" "}
            header as a Bearer token.
          </p>
        </div>

        {/* Create key */}
        <div className="mt-5 flex items-end gap-3">
          <div className="max-w-xs flex-1">
            <Input
              placeholder="Key name (e.g. Production)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createKey();
              }}
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={createKey}
            disabled={creating}
          >
            <Plus size={14} />
            {creating ? "Creating..." : "Generate key"}
          </Button>
        </div>

        {/* Newly created key reveal */}
        {revealedKey && (
          <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-4">
            <p className="text-xs font-medium text-warning mb-2">
              Copy this key now. It won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-surface px-3 py-2 font-mono text-xs text-foreground break-all select-all">
                {revealedKey}
              </code>
              <button
                onClick={() => copyToClipboard(revealedKey)}
                className="shrink-0 rounded-lg p-2 text-foreground-secondary hover:text-foreground hover:bg-surface transition-colors"
                aria-label={copiedKey ? "Copied" : "Copy key"}
              >
                {copiedKey ? (
                  <Check size={14} className="text-success" />
                ) : (
                  <Copy size={14} />
                )}
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
        <div className="mt-5 space-y-2">
          {keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8">
              <Key size={20} className="text-foreground-secondary mb-2" />
              <p className="text-sm text-foreground-secondary">
                No API keys yet. Generate one to get started.
              </p>
            </div>
          ) : (
            keys.map((k) => (
              <div
                key={k.id}
                className="rounded-lg border border-border bg-surface p-4 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{k.name}</p>
                  <p className="mt-1 font-mono text-xs text-foreground-secondary">
                    {k.maskedKey}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-foreground-muted">
                    <span>
                      Created{" "}
                      {new Date(k.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {k.lastUsed && (
                      <span>
                        Last used{" "}
                        {new Date(k.lastUsed).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setDeleteTarget(k)}
                  className="shrink-0 rounded-lg p-2 text-foreground-secondary hover:text-error hover:bg-error/10 transition-colors"
                  aria-label={`Delete key ${k.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete API key"
      >
        <p className="text-sm text-foreground-secondary">
          Are you sure you want to delete{" "}
          <span className="font-medium text-foreground">
            {deleteTarget?.name}
          </span>
          ? Any integrations using this key will immediately stop working.
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
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
            onClick={deleteKey}
            disabled={deleting}
            className="bg-error hover:bg-error/90 text-white"
          >
            {deleting ? "Deleting..." : "Delete key"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
