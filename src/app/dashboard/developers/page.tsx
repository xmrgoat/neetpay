"use client";

import { SITE_URL } from "@/lib/constants";
import { ApiKeysManager } from "@/components/dashboard/developers/api-keys-manager";
import { WebhookManager } from "@/components/dashboard/developers/webhook-manager";
import { WidgetEmbed } from "@/components/dashboard/developers/widget-embed";
import { WhiteLabel } from "@/components/dashboard/developers/white-label";
import { QuickStartCodeClient, BaseUrlCopy } from "./client-bits";
import { DevelopersShell } from "./shell";
import { DevelopersTabs } from "./tabs";

const EMPTY_BRANDING = {
  logoUrl: null,
  brandName: null,
  primaryColor: null,
  accentColor: null,
  customDomain: null,
  hideNeetpay: false,
};

export default function DevelopersPage() {
  const baseUrl = SITE_URL;

  const quickStartCode = `curl -X POST ${baseUrl}/api/v1/payment/create \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 50.00,
    "currency": "USD",
    "payCurrencyKey": "XMR",
    "description": "Order #1234"
  }'`;

  const createPaymentBody = `{
  "amount": 50.00,
  "currency": "USD",
  "payCurrencyKey": "XMR",
  "description": "Order #1234",
  "lifetimeMinutes": 60
}`;

  const paymentStatusResponse = `{
  "trackId": "pay_abc123",
  "status": "paid",
  "amount": 50.00,
  "currency": "USD",
  "payCurrency": "XMR",
  "payAmount": 0.3412,
  "confirmations": 10
}`;

  const currenciesResponse = `[
  { "key": "XMR", "name": "Monero",
    "chain": "monero", "native": true },
  { "key": "BTC", "name": "Bitcoin",
    "chain": "bitcoin", "native": true },
  { "key": "ETH", "name": "Ethereum",
    "chain": "evm", "native": true }
]`;

  return (
    <DevelopersShell>
      {/* Header */}
      <div data-animate>
        <h1 className="font-heading text-lg font-semibold text-foreground">
          Developers
        </h1>
        <p className="text-xs text-muted mt-0.5">
          API keys, webhooks, widget integration, and white-label configuration
        </p>
      </div>

      {/* Tabs */}
      <div data-animate>
        <DevelopersTabs
          tabs={{
            api: (
              <div className="space-y-8">
                {/* Quick Start */}
                <section className="rounded-xl border border-border bg-elevated p-6">
                  <h2 className="font-heading text-lg font-semibold tracking-tight">
                    Quick Start
                  </h2>
                  <p className="mt-1 text-sm text-foreground-secondary">
                    Create a payment invoice with a single API call. Replace{" "}
                    <code className="font-mono text-xs text-primary">
                      YOUR_API_KEY
                    </code>{" "}
                    with a key generated below.
                  </p>

                  <div className="mt-4">
                    <QuickStartCodeClient code={quickStartCode} />
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground-secondary">
                      Base URL
                    </span>
                    <BaseUrlCopy baseUrl={baseUrl} />
                  </div>
                </section>

                {/* API Keys */}
                <ApiKeysManager keys={[]} />

                {/* Webhooks */}
                <WebhookManager
                  currentUrl={null}
                  webhookSecret={null}
                  initialLogs={[]}
                />

                {/* API Reference Cards */}
                <div>
                  <h2 className="font-heading text-lg font-semibold tracking-tight mb-4">
                    API Reference
                  </h2>
                  <div className="grid gap-4 md:grid-cols-3">
                    <EndpointCard
                      method="POST"
                      path="/api/v1/payment/create"
                      description="Create a new payment invoice with amount, currency, and crypto selection."
                      snippet={createPaymentBody}
                    />
                    <EndpointCard
                      method="GET"
                      path="/api/v1/payment/:trackId"
                      description="Check the current status and details of an existing payment."
                      snippet={paymentStatusResponse}
                    />
                    <EndpointCard
                      method="GET"
                      path="/api/v1/currencies"
                      description="List all supported cryptocurrencies and chain configurations."
                      snippet={currenciesResponse}
                    />
                  </div>
                </div>
              </div>
            ),
            widget: (
              <WidgetEmbed publishableKey={null} siteUrl={baseUrl} />
            ),
            whitelabel: (
              <WhiteLabel
                initialBranding={EMPTY_BRANDING}
                siteUrl={baseUrl}
              />
            ),
          }}
        />
      </div>
    </DevelopersShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function EndpointCard({
  method,
  path,
  description,
  snippet,
}: {
  method: "GET" | "POST";
  path: string;
  description: string;
  snippet: string;
}) {
  const methodColor =
    method === "POST"
      ? "bg-primary/15 text-primary"
      : "bg-blue-500/15 text-blue-400";

  return (
    <div className="rounded-xl border border-border bg-elevated p-5 flex flex-col">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold font-mono uppercase tracking-wider ${methodColor}`}
        >
          {method}
        </span>
        <span className="font-mono text-xs text-foreground-secondary truncate">
          {path}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted leading-relaxed">{description}</p>
      <pre className="mt-3 flex-1 rounded-lg bg-surface border border-border p-3 overflow-x-auto">
        <code className="font-mono text-xs text-foreground-secondary leading-relaxed whitespace-pre">
          {snippet}
        </code>
      </pre>
    </div>
  );
}
