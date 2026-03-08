"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Check,
  Upload,
  Globe,
  EyeOff,
  Eye,
  Paintbrush,
  RotateCcw,
} from "lucide-react";

interface BrandingData {
  logoUrl: string | null;
  brandName: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  customDomain: string | null;
  hideNeetpay: boolean;
}

interface WhiteLabelProps {
  initialBranding: BrandingData;
  siteUrl: string;
}

export function WhiteLabel({ initialBranding, siteUrl }: WhiteLabelProps) {
  const router = useRouter();
  const [branding, setBranding] = useState<BrandingData>(initialBranding);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  function update<K extends keyof BrandingData>(key: K, value: BrandingData[K]) {
    setBranding((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setSaved(false);
  }

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);

    try {
      const res = await fetch("/api/dashboard/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      });

      if (res.ok) {
        setSaved(true);
        setDirty(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }, [branding, saving, router]);

  const reset = useCallback(() => {
    setBranding(initialBranding);
    setDirty(false);
    setSaved(false);
  }, [initialBranding]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(t);
  }, [saved]);

  const previewPrimary = branding.primaryColor || "#FF6600";
  const previewAccent = branding.accentColor || "#FF7A1A";

  return (
    <section className="rounded-xl border border-border bg-elevated p-6">
      <div className="mb-1">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          White-Label
        </h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          Fully customize the checkout experience your customers see. Remove all
          NeetPay branding and use your own.
        </p>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr,320px]">
        {/* Configuration */}
        <div className="space-y-5">
          {/* Brand name */}
          <Input
            label="Brand name"
            placeholder="Your Company"
            value={branding.brandName || ""}
            onChange={(e) => update("brandName", e.target.value || null)}
            hint="Displayed in the checkout header and receipts"
          />

          {/* Logo URL */}
          <Input
            label="Logo URL"
            placeholder="https://your-site.com/logo.svg"
            value={branding.logoUrl || ""}
            onChange={(e) => update("logoUrl", e.target.value || null)}
            icon={<Upload size={14} />}
            hint="SVG or PNG, recommended 200x50px. Displayed in checkout header."
          />

          {/* Colors */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-secondary">
                Primary color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.primaryColor || "#FF6600"}
                  onChange={(e) => update("primaryColor", e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded-lg border border-border bg-surface p-0.5"
                />
                <Input
                  placeholder="#FF6600"
                  value={branding.primaryColor || ""}
                  onChange={(e) => update("primaryColor", e.target.value || null)}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted">
                Buttons, links, and accents
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground-secondary">
                Accent color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.accentColor || "#FF7A1A"}
                  onChange={(e) => update("accentColor", e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded-lg border border-border bg-surface p-0.5"
                />
                <Input
                  placeholder="#FF7A1A"
                  value={branding.accentColor || ""}
                  onChange={(e) => update("accentColor", e.target.value || null)}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted">
                Hover states and secondary highlights
              </p>
            </div>
          </div>

          {/* Custom domain */}
          <Input
            label="Custom domain"
            placeholder="pay.your-site.com"
            value={branding.customDomain || ""}
            onChange={(e) => update("customDomain", e.target.value || null)}
            icon={<Globe size={14} />}
            hint="Point a CNAME to pay.neetpay.com. We handle SSL automatically."
          />

          {/* Hide NeetPay branding */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
            <div className="flex items-center gap-3">
              {branding.hideNeetpay ? (
                <EyeOff size={16} className="text-primary" />
              ) : (
                <Eye size={16} className="text-foreground-secondary" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  Hide &quot;Powered by NeetPay&quot;
                </p>
                <p className="text-xs text-muted">
                  Remove all NeetPay branding from the checkout page
                </p>
              </div>
            </div>
            <button
              onClick={() => update("hideNeetpay", !branding.hideNeetpay)}
              className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${
                branding.hideNeetpay ? "bg-primary" : "bg-border"
              }`}
              role="switch"
              aria-checked={branding.hideNeetpay}
              aria-label="Hide NeetPay branding"
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
                  branding.hideNeetpay ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={save}
              disabled={saving || !dirty}
            >
              {saving ? "Saving..." : "Save branding"}
            </Button>
            {dirty && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw size={13} />
                Reset
              </Button>
            )}
            {saved && (
              <span className="flex items-center gap-1 text-xs font-mono text-success">
                <Check size={12} />
                Saved
              </span>
            )}
          </div>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-6 h-fit">
          <p className="text-xs font-medium uppercase tracking-widest text-foreground-secondary mb-3">
            Checkout Preview
          </p>
          <div
            className="rounded-xl border border-border overflow-hidden"
            style={{ background: "#0a0a0f" }}
          >
            {/* Header */}
            <div className="border-b border-white/[0.06] px-5 py-4 flex items-center gap-3">
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt=""
                  className="h-6 w-auto max-w-[100px] object-contain"
                />
              ) : (
                <div className="h-6 w-6 rounded-md bg-white/[0.08]" />
              )}
              <span className="text-sm font-medium text-white/90">
                {branding.brandName || "Your Brand"}
              </span>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Amount */}
              <div className="text-center py-3">
                <p className="text-xs text-white/40 mb-1">Amount due</p>
                <p className="text-2xl font-heading font-semibold text-white">
                  $50.00
                </p>
                <p className="text-xs text-white/40 mt-1">
                  0.3412 XMR
                </p>
              </div>

              {/* Fake QR placeholder */}
              <div className="mx-auto w-28 h-28 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                <div className="grid grid-cols-4 gap-1">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-2.5 w-2.5 rounded-[2px]"
                      style={{
                        backgroundColor:
                          Math.random() > 0.4
                            ? "rgba(255,255,255,0.15)"
                            : "transparent",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* CTA */}
              <button
                className="w-full rounded-lg py-2.5 text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: previewPrimary }}
                disabled
              >
                Copy address
              </button>

              {/* Status */}
              <div className="flex items-center justify-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-xs text-white/40">
                  Waiting for payment...
                </span>
              </div>
            </div>

            {/* Footer */}
            {!branding.hideNeetpay && (
              <div className="border-t border-white/[0.06] px-5 py-2.5 text-center">
                <span className="text-[10px] text-white/20">
                  Powered by{" "}
                  <span className="text-white/30">neet</span>
                  <span style={{ color: previewPrimary }}>pay</span>
                </span>
              </div>
            )}
          </div>

          {/* Domain preview */}
          <div className="mt-3 rounded-lg border border-border bg-surface px-3 py-2 flex items-center gap-2">
            <Globe size={12} className="text-muted shrink-0" />
            <span className="font-mono text-xs text-foreground-secondary truncate">
              {branding.customDomain
                ? `https://${branding.customDomain}/pay/inv_abc123`
                : `${siteUrl}/pay/inv_abc123`}
            </span>
          </div>
        </div>
      </div>

      {/* Setup instructions */}
      <div className="mt-6 pt-6 border-t border-border">
        <h3 className="text-xs font-medium uppercase tracking-widest text-foreground-secondary mb-3">
          Custom Domain Setup
        </h3>
        <div className="space-y-3">
          <Step
            n={1}
            title="Add a CNAME record"
            desc={
              <>
                Point{" "}
                <code className="font-mono text-xs text-primary">
                  {branding.customDomain || "pay.your-site.com"}
                </code>{" "}
                to{" "}
                <code className="font-mono text-xs text-primary">
                  pay.neetpay.com
                </code>{" "}
                in your DNS provider.
              </>
            }
          />
          <Step
            n={2}
            title="Enter the domain above"
            desc="Save your custom domain in the field above. We'll verify the CNAME and provision an SSL certificate automatically."
          />
          <Step
            n={3}
            title="Use your domain"
            desc={
              <>
                All checkout links will use{" "}
                <code className="font-mono text-xs text-primary">
                  https://{branding.customDomain || "pay.your-site.com"}
                </code>{" "}
                instead of the default NeetPay URL.
              </>
            }
          />
        </div>
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  desc,
}: {
  n: number;
  title: string;
  desc: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-xs font-mono text-foreground-secondary">
        {n}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
