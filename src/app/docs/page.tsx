import { CodeBlock } from "@/components/ui/code-block";

export default function DocsPage() {
  return (
    <article className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Introduction
        </h1>
        <p className="mt-4 text-lg text-foreground-secondary leading-relaxed">
          neetpay is a permissionless crypto payment gateway. Accept 18+
          cryptocurrencies with a single API integration. No KYC, no approval
          process, no middlemen.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Quick example
        </h2>
        <p className="text-foreground-secondary leading-relaxed">
          Create a payment invoice with a single API call:
        </p>
        <CodeBlock
          filename="create-payment.ts"
          code={`const response = await fetch("https://api.neetpay.com/v1/invoice", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer sk_live_your_api_key",
  },
  body: JSON.stringify({
    amount: 29.99,
    currency: "USD",
    description: "Pro Plan - Monthly",
  }),
});

const { trackId, payLink } = await response.json();
// Redirect user to payLink or use white-label flow`}
        />
      </div>

      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Core concepts
        </h2>
        <ul className="space-y-3 text-foreground-secondary leading-relaxed">
          <li className="flex items-start gap-3">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span>
              <strong className="text-foreground">Invoices</strong> — Create
              payment requests with amount, currency, and optional metadata.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span>
              <strong className="text-foreground">Webhooks</strong> — Receive
              real-time notifications when payment status changes.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span>
              <strong className="text-foreground">White Label</strong> — Build
              custom payment flows with your own UI. Get pay addresses directly.
            </span>
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-elevated p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-foreground-secondary mb-2">
          Next up
        </p>
        <p className="text-sm text-foreground">
          Follow the Quick Start guide to create your first payment in under 5
          minutes.
        </p>
      </div>
    </article>
  );
}
