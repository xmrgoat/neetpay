"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ProfileSectionProps {
  name: string | null;
  email: string;
}

export function ProfileSection({ name, email }: ProfileSectionProps) {
  const [nameValue, setNameValue] = useState(name || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSave() {
    if (!nameValue.trim()) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue.trim() }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Profile updated" });
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({
          type: "error",
          text: data.error || "Failed to save profile",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-elevated p-6">
      <h2 className="font-heading text-base font-medium mb-4">Profile</h2>

      <div className="grid gap-4 max-w-md">
        <Input
          label="Name"
          value={nameValue}
          onChange={(e) => {
            setNameValue(e.target.value);
            setMessage(null);
          }}
          placeholder="Your display name"
        />

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Email</p>
          <p className="text-sm text-muted font-mono">{email}</p>
        </div>

        <div className="flex items-center gap-3 mt-4 justify-end">
          {message && (
            <span
              className={`text-xs ${
                message.type === "success" ? "text-success" : "text-error"
              }`}
            >
              {message.text}
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving || !nameValue.trim()}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </section>
  );
}
