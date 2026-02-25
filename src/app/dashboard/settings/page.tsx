"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Eye, EyeOff, Plus } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [showKey, setShowKey] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  const maskedKey = "sk_live_••••••••••••••••••••••••";

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Manage your account, API keys, and webhooks.
        </p>
      </div>

      {/* Profile */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-sm font-medium uppercase tracking-widest text-foreground-secondary mb-6">
          Profile
        </h2>
        <div className="grid gap-4 max-w-md">
          <Input
            label="Name"
            defaultValue={session?.user?.name ?? ""}
            readOnly
          />
          <Input
            label="Email"
            defaultValue={session?.user?.email ?? ""}
            readOnly
          />
          <div>
            <p className="text-xs text-foreground-secondary">
              Plan: <span className="font-medium text-foreground">Free</span>
            </p>
          </div>
        </div>
      </section>

      {/* API Keys */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-medium uppercase tracking-widest text-foreground-secondary">
            API Keys
          </h2>
          <Button variant="secondary" size="sm">
            <Plus size={14} />
            New key
          </Button>
        </div>

        <div className="rounded-lg border border-border p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Default</p>
            <p className="mt-1 font-mono text-xs text-foreground-secondary">
              {showKey ? "sk_live_abc123def456ghi789jkl012" : maskedKey}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKey(!showKey)}
              className="rounded-lg p-2 text-foreground-secondary hover:text-foreground hover:bg-elevated transition-colors"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button className="rounded-lg p-2 text-foreground-secondary hover:text-foreground hover:bg-elevated transition-colors">
              <Copy size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* Webhook */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-sm font-medium uppercase tracking-widest text-foreground-secondary mb-6">
          Webhook
        </h2>
        <div className="max-w-md space-y-4">
          <Input
            label="Webhook URL"
            placeholder="https://your-site.com/api/webhook"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          <Button variant="secondary" size="sm">
            Save webhook
          </Button>
        </div>
      </section>
    </div>
  );
}
