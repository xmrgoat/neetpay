"use client";

import { useState, useCallback } from "react";
import { CodeBlock } from "@/components/ui/code-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, ExternalLink, Palette, Code2, Zap } from "lucide-react";

interface WidgetEmbedProps {
  publishableKey: string | null;
  siteUrl: string;
}

const FRAMEWORKS = ["HTML", "React", "Vue", "Next.js"] as const;
type Framework = (typeof FRAMEWORKS)[number];

function generateSnippet(
  framework: Framework,
  publishableKey: string,
  siteUrl: string,
  opts: { amount: string; currency: string; description: string },
): string {
  const pk = publishableKey || "pk_live_YOUR_KEY";
  const amt = opts.amount || "50.00";
  const cur = opts.currency || "USD";
  const desc = opts.description || "Order #1234";

  switch (framework) {
    case "HTML":
      return `<!-- NeetPay Checkout Widget -->
<div id="neetpay-checkout"></div>

<script src="${siteUrl}/widget.js"></script>
<script>
  NeetPay.init({
    publishableKey: "${pk}",
    container: "#neetpay-checkout",
    amount: ${amt},
    currency: "${cur}",
    description: "${desc}",
    theme: "dark",
    onSuccess: (payment) => {
      console.log("Payment confirmed:", payment.trackId);
    },
    onError: (error) => {
      console.error("Payment failed:", error);
    },
  });
</script>`;

    case "React":
      return `import { NeetPayCheckout } from "@neetpay/react";

export function Checkout() {
  return (
    <NeetPayCheckout
      publishableKey="${pk}"
      amount={${amt}}
      currency="${cur}"
      description="${desc}"
      theme="dark"
      onSuccess={(payment) => {
        console.log("Payment confirmed:", payment.trackId);
      }}
      onError={(error) => {
        console.error("Payment failed:", error);
      }}
    />
  );
}`;

    case "Vue":
      return `<template>
  <NeetPayCheckout
    :publishable-key="publishableKey"
    :amount="${amt}"
    currency="${cur}"
    description="${desc}"
    theme="dark"
    @success="onSuccess"
    @error="onError"
  />
</template>

<script setup>
import { NeetPayCheckout } from "@neetpay/vue";

const publishableKey = "${pk}";

function onSuccess(payment) {
  console.log("Payment confirmed:", payment.trackId);
}
function onError(error) {
  console.error("Payment failed:", error);
}
</script>`;

    case "Next.js":
      return `"use client";

import { NeetPayCheckout } from "@neetpay/react";

export default function CheckoutPage() {
  return (
    <NeetPayCheckout
      publishableKey="${pk}"
      amount={${amt}}
      currency="${cur}"
      description="${desc}"
      theme="dark"
      onSuccess={(payment) => {
        // Redirect or update UI
        window.location.href = \`/success?id=\${payment.trackId}\`;
      }}
      onError={(error) => {
        console.error("Payment failed:", error);
      }}
    />
  );
}`;
  }
}

export function WidgetEmbed({ publishableKey, siteUrl }: WidgetEmbedProps) {
  const [framework, setFramework] = useState<Framework>("HTML");
  const [amount, setAmount] = useState("50.00");
  const [currency, setCurrency] = useState("USD");
  const [description, setDescription] = useState("Order #1234");
  const [copiedInline, setCopiedInline] = useState(false);

  const pk = publishableKey || "pk_live_YOUR_KEY";

  const snippet = generateSnippet(framework, pk, siteUrl, {
    amount,
    currency,
    description,
  });

  const inlineSnippet = `<script src="${siteUrl}/widget.js"></script>
<button
  data-neetpay-checkout
  data-key="${pk}"
  data-amount="${amount}"
  data-currency="${currency}"
  data-description="${description}"
>
  Pay with Crypto
</button>`;

  const copyInline = useCallback(async () => {
    await navigator.clipboard.writeText(inlineSnippet);
    setCopiedInline(true);
    setTimeout(() => setCopiedInline(false), 2000);
  }, [inlineSnippet]);

  return (
    <section className="rounded-xl border border-border bg-elevated p-6">
      <div className="mb-1">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Embeddable Widget
        </h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          Drop a fully-functional checkout into any website. Use your{" "}
          <code className="font-mono text-xs text-primary">pk_live_</code> key
          &mdash; it&apos;s safe for the frontend.
        </p>
      </div>

      {/* Quick inline embed */}
      <div className="mt-5 rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-primary" />
          <p className="text-xs font-medium text-foreground">
            Quickest integration &mdash; single line
          </p>
        </div>
        <div className="flex items-start gap-3">
          <pre className="flex-1 rounded-lg bg-background border border-border p-3 overflow-x-auto">
            <code className="font-mono text-xs text-foreground-secondary leading-relaxed whitespace-pre">
              {inlineSnippet}
            </code>
          </pre>
          <button
            onClick={copyInline}
            className="shrink-0 mt-2 rounded-lg p-2 text-foreground-secondary hover:text-foreground hover:bg-elevated transition-colors"
            aria-label="Copy inline snippet"
          >
            {copiedInline ? (
              <Check size={14} className="text-success" />
            ) : (
              <Copy size={14} />
            )}
          </button>
        </div>
      </div>

      {/* Framework-specific integration */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium uppercase tracking-widest text-foreground-secondary">
            Framework Integration
          </p>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {FRAMEWORKS.map((fw) => (
              <button
                key={fw}
                onClick={() => setFramework(fw)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  framework === fw
                    ? "bg-primary text-white"
                    : "bg-surface text-foreground-secondary hover:text-foreground hover:bg-elevated"
                }`}
              >
                {fw}
              </button>
            ))}
          </div>
        </div>

        {/* Config fields */}
        <div className="grid gap-3 sm:grid-cols-3 mb-4">
          <Input
            label="Amount"
            placeholder="50.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            label="Currency"
            placeholder="USD"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
          <Input
            label="Description"
            placeholder="Order #1234"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <CodeBlock
          code={snippet}
          language={framework === "HTML" ? "html" : framework === "Vue" ? "html" : "tsx"}
          filename={
            framework === "HTML"
              ? "index.html"
              : framework === "React"
                ? "Checkout.tsx"
                : framework === "Vue"
                  ? "Checkout.vue"
                  : "checkout.tsx"
          }
        />
      </div>

      {/* Widget features */}
      <div className="mt-6 pt-6 border-t border-border">
        <h3 className="text-xs font-medium uppercase tracking-widest text-foreground-secondary mb-3">
          Widget Features
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <FeatureCard
            icon={<Code2 size={16} />}
            title="Zero dependencies"
            desc="Single script tag. No build step needed. Works everywhere."
          />
          <FeatureCard
            icon={<Palette size={16} />}
            title="Fully themeable"
            desc="Match your brand colors, fonts, and border radius. Or go white-label."
          />
          <FeatureCard
            icon={<ExternalLink size={16} />}
            title="Callbacks & events"
            desc="onSuccess, onError, onPending — hook into every payment state."
          />
        </div>
      </div>

      {/* Widget config options table */}
      <div className="mt-6 pt-6 border-t border-border">
        <h3 className="text-xs font-medium uppercase tracking-widest text-foreground-secondary mb-3">
          Configuration
        </h3>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left font-medium text-foreground-secondary px-4 py-2.5">
                  Option
                </th>
                <th className="text-left font-medium text-foreground-secondary px-4 py-2.5">
                  Type
                </th>
                <th className="text-left font-medium text-foreground-secondary px-4 py-2.5">
                  Default
                </th>
                <th className="text-left font-medium text-foreground-secondary px-4 py-2.5 hidden sm:table-cell">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {WIDGET_OPTIONS.map((opt) => (
                <tr key={opt.name} className="hover:bg-surface/50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-primary">
                    {opt.name}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-foreground-secondary">
                    {opt.type}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted">
                    {opt.default}
                  </td>
                  <td className="px-4 py-2.5 text-muted hidden sm:table-cell">
                    {opt.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-primary mb-2">{icon}</div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted leading-relaxed">{desc}</p>
    </div>
  );
}

const WIDGET_OPTIONS = [
  {
    name: "publishableKey",
    type: "string",
    default: "—",
    description: "Your pk_live_ publishable key",
  },
  {
    name: "amount",
    type: "number",
    default: "—",
    description: "Payment amount in fiat",
  },
  {
    name: "currency",
    type: "string",
    default: '"USD"',
    description: "Fiat currency code (USD, EUR, GBP...)",
  },
  {
    name: "description",
    type: "string",
    default: '""',
    description: "Payment description shown to payer",
  },
  {
    name: "theme",
    type: '"dark" | "light"',
    default: '"dark"',
    description: "Widget color scheme",
  },
  {
    name: "locale",
    type: "string",
    default: '"en"',
    description: "UI language (en, fr, es, de, ja...)",
  },
  {
    name: "container",
    type: "string",
    default: "—",
    description: "CSS selector for mount target (HTML only)",
  },
  {
    name: "onSuccess",
    type: "(payment) => void",
    default: "—",
    description: "Called when payment is confirmed (10 blocks)",
  },
  {
    name: "onError",
    type: "(error) => void",
    default: "—",
    description: "Called on payment failure or timeout",
  },
  {
    name: "onPending",
    type: "(payment) => void",
    default: "—",
    description: "Called when payment is detected but unconfirmed",
  },
];
