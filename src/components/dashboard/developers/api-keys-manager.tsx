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
  type: string;
  maskedKey: string;
  lastUsed: string | null;
  createdAt: string;
}

interface RevealedKeys {
  secretKey: { id: string; key: string };
  publishableKey: { id: string; key: string };
}

interface ApiKeysManagerProps {
  keys: MaskedKey[];
}

export function ApiKeysManager({ keys }: ApiKeysManagerProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKeys, setRevealedKeys] = useState<RevealedKeys | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaskedKey | null>(null);
  const [deleting, setDeleting] = useState(false);

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
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
        setRevealedKeys({
          secretKey: { id: data.secretKey.id, key: data.secretKey.key },
          publishableKey: { id: data.publishableKey.id, key: data.publishableKey.key },
        });
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

  // Group keys by type for display
  const secretKeys = keys.filter((k) => k.type === "secret");
  const publishableKeys = keys.filter((k) => k.type === "publishable");

  return (
    <>
      <section className="rounded-xl border border-border bg-elevated p-6">
        <div className="mb-1">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            API Keys
          </h2>
          <p className="mt-1 text-sm text-foreground-secondary">
            Use <strong>secret keys</strong> (<code className="font-mono text-xs text-primary">sk_live_</code>) server-side only.
            Use <strong>publishable keys</strong> (<code className="font-mono text-xs text-primary">pk_live_</code>) in your frontend SDK.
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
            {creating ? "Creating..." : "Generate key pair"}
          </Button>
        </div>

        {/* Newly created key pair reveal */}
        {revealedKeys && (
          <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
            <p className="text-xs font-medium text-warning">
              Copy both keys now. The secret key will not be shown again.
            </p>

            {/* Secret key */}
            <div>
              <p className="text-xs text-foreground-secondary mb-1 font-medium">
                Secret key <span className="text-muted">(server-side only)</span>
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-surface px-3 py-2 font-mono text-xs text-foreground break-all select-all">
                  {revealedKeys.secretKey.key}
                </code>
                <button
                  onClick={() => copyToClipboard(revealedKeys.secretKey.key, "sk")}
                  className="shrink-0 rounded-lg p-2 text-foreground-secondary hover:text-foreground hover:bg-surface transition-colors"
                  aria-label="Copy secret key"
                >
                  {copiedField === "sk" ? (
                    <Check size={14} className="text-success" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>

            {/* Publishable key */}
            <div>
              <p className="text-xs text-foreground-secondary mb-1 font-medium">
                Publishable key <span className="text-muted">(safe for frontend)</span>
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-surface px-3 py-2 font-mono text-xs text-foreground break-all select-all">
                  {revealedKeys.publishableKey.key}
                </code>
                <button
                  onClick={() => copyToClipboard(revealedKeys.publishableKey.key, "pk")}
                  className="shrink-0 rounded-lg p-2 text-foreground-secondary hover:text-foreground hover:bg-surface transition-colors"
                  aria-label="Copy publishable key"
                >
                  {copiedField === "pk" ? (
                    <Check size={14} className="text-success" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => setRevealedKeys(null)}
              className="text-xs text-foreground-secondary hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Key list — Secret keys */}
        {secretKeys.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted mb-2">
              Secret keys
            </p>
            <div className="space-y-2">
              {secretKeys.map((k) => (
                <KeyRow key={k.id} k={k} onDelete={setDeleteTarget} />
              ))}
            </div>
          </div>
        )}

        {/* Key list — Publishable keys */}
        {publishableKeys.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted mb-2">
              Publishable keys
            </p>
            <div className="space-y-2">
              {publishableKeys.map((k) => (
                <KeyRow key={k.id} k={k} onDelete={setDeleteTarget} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {keys.length === 0 && (
          <div className="mt-5 flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8">
            <Key size={20} className="text-foreground-secondary mb-2" />
            <p className="text-sm text-foreground-secondary">
              No API keys yet. Generate a key pair to get started.
            </p>
          </div>
        )}
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

function KeyRow({
  k,
  onDelete,
}: {
  k: MaskedKey;
  onDelete: (k: MaskedKey) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 flex items-center justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{k.name}</p>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
              k.type === "secret"
                ? "bg-error/10 text-error"
                : "bg-primary/10 text-primary"
            }`}
          >
            {k.type === "secret" ? "Secret" : "Publishable"}
          </span>
        </div>
        <p className="mt-1 font-mono text-xs text-foreground-secondary">
          {k.maskedKey}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted">
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
        onClick={() => onDelete(k)}
        className="shrink-0 rounded-lg p-2 text-foreground-secondary hover:text-error hover:bg-error/10 transition-colors"
        aria-label={`Delete key ${k.name}`}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
