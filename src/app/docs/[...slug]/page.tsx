import { CodeBlock } from "@/components/ui/code-block";

const DOCS_CONTENT: Record<
  string,
  { title: string; description: string; content: React.ReactNode }
> = {
  "quick-start": {
    title: "Quick Start",
    description: "Get up and running with neetpay in under 5 minutes.",
    content: (
      <div className="space-y-6">
        <div className="space-y-3">
          <h3 className="font-heading text-lg font-semibold">1. Get your API key</h3>
          <p className="text-foreground-secondary leading-relaxed">
            Sign up at neetpay.com and navigate to Settings to generate your API key.
          </p>
        </div>
        <div className="space-y-3">
          <h3 className="font-heading text-lg font-semibold">2. Create an invoice</h3>
          <CodeBlock
            filename="terminal"
            code={`curl -X POST https://api.neetpay.com/v1/invoice \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk_live_your_key" \\
  -d '{"amount": 10, "currency": "USD"}'`}
          />
        </div>
        <div className="space-y-3">
          <h3 className="font-heading text-lg font-semibold">3. Handle webhooks</h3>
          <p className="text-foreground-secondary leading-relaxed">
            Set up a webhook endpoint to receive payment notifications. We&apos;ll send
            a POST request with HMAC-SHA512 signature verification.
          </p>
        </div>
      </div>
    ),
  },
  authentication: {
    title: "Authentication",
    description: "Learn how to authenticate your API requests.",
    content: (
      <div className="space-y-6">
        <p className="text-foreground-secondary leading-relaxed">
          All API requests must include your API key in the Authorization header.
        </p>
        <CodeBlock
          filename="request.ts"
          code={`const headers = {
  "Content-Type": "application/json",
  "Authorization": "Bearer sk_live_your_api_key",
};`}
        />
        <div className="rounded-xl border border-border bg-elevated p-4">
          <p className="text-sm text-foreground-secondary">
            Keep your API keys secure. Never expose them in client-side code or
            public repositories.
          </p>
        </div>
      </div>
    ),
  },
  "api/create-invoice": {
    title: "Create Invoice",
    description: "Create a new payment invoice.",
    content: (
      <div className="space-y-6">
        <div className="rounded-lg border border-border p-4">
          <code className="font-mono text-sm text-primary">
            POST /v1/invoice
          </code>
        </div>
        <h3 className="font-heading text-lg font-semibold">Parameters</h3>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-foreground-secondary">Param</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-foreground-secondary">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-foreground-secondary">Required</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-4 py-3 font-mono text-xs">amount</td>
                <td className="px-4 py-3 text-foreground-secondary">number</td>
                <td className="px-4 py-3 text-foreground-secondary">Yes</td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-3 font-mono text-xs">currency</td>
                <td className="px-4 py-3 text-foreground-secondary">string</td>
                <td className="px-4 py-3 text-foreground-secondary">No (default: USD)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-xs">description</td>
                <td className="px-4 py-3 text-foreground-secondary">string</td>
                <td className="px-4 py-3 text-foreground-secondary">No</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    ),
  },
  "api/payment-status": {
    title: "Payment Status",
    description: "Check the status of an existing payment.",
    content: (
      <div className="space-y-6">
        <div className="rounded-lg border border-border p-4">
          <code className="font-mono text-sm text-primary">
            GET /v1/status/:trackId
          </code>
        </div>
        <p className="text-foreground-secondary leading-relaxed">
          Returns the current status of a payment along with transaction details.
        </p>
        <CodeBlock
          filename="response.json"
          code={`{
  "trackId": "T2409201234",
  "status": "paid",
  "amount": 29.99,
  "currency": "USD",
  "payCurrency": "XMR",
  "payAmount": 0.1847,
  "txId": "a3f8c2..."
}`}
        />
      </div>
    ),
  },
  "api/webhooks": {
    title: "Webhooks",
    description: "Receive real-time payment notifications.",
    content: (
      <div className="space-y-6">
        <p className="text-foreground-secondary leading-relaxed">
          Configure a webhook URL in your dashboard settings. We&apos;ll send POST
          requests with payment updates signed using HMAC-SHA512.
        </p>
        <h3 className="font-heading text-lg font-semibold">Verification</h3>
        <CodeBlock
          filename="verify-webhook.ts"
          code={`import crypto from "crypto";

function verifyWebhook(body: string, signature: string, secret: string) {
  const hmac = crypto
    .createHmac("sha512", secret)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(hmac, "hex"),
    Buffer.from(signature, "hex")
  );
}`}
        />
      </div>
    ),
  },
  "api/currencies": {
    title: "Currencies",
    description: "Get the list of accepted cryptocurrencies.",
    content: (
      <div className="space-y-6">
        <div className="rounded-lg border border-border p-4">
          <code className="font-mono text-sm text-primary">
            GET /v1/currencies
          </code>
        </div>
        <p className="text-foreground-secondary leading-relaxed">
          Returns all supported cryptocurrencies and their networks. Response is
          cached for 5 minutes.
        </p>
      </div>
    ),
  },
  "guides/white-label": {
    title: "White Label Integration",
    description: "Build custom payment flows with your own UI.",
    content: (
      <div className="space-y-6">
        <p className="text-foreground-secondary leading-relaxed">
          The white label API lets you create payment requests that return a direct
          crypto address, so you can build the entire payment UI yourself.
        </p>
        <CodeBlock
          filename="white-label.ts"
          code={`const response = await fetch("/v1/invoice/whitelabel", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer sk_live_your_key",
  },
  body: JSON.stringify({
    amount: 29.99,
    currency: "USD",
    payCurrency: "XMR",
  }),
});

const { payAddress, payAmount, network } = await response.json();
// Display address in your own QR code component`}
        />
      </div>
    ),
  },
  "guides/subscriptions": {
    title: "Subscriptions",
    description: "Handle recurring payments with crypto.",
    content: (
      <div className="space-y-6">
        <p className="text-foreground-secondary leading-relaxed">
          Crypto payments are inherently one-time, but you can build subscription
          flows by creating invoices at regular intervals and tracking payment status
          via webhooks.
        </p>
      </div>
    ),
  },
  "guides/error-handling": {
    title: "Error Handling",
    description: "Handle API errors gracefully.",
    content: (
      <div className="space-y-6">
        <p className="text-foreground-secondary leading-relaxed">
          All API errors return a JSON object with an error field describing the issue.
        </p>
        <CodeBlock
          filename="error-response.json"
          code={`{
  "error": "Invalid API key",
  "status": 401
}`}
        />
      </div>
    ),
  },
};

export default async function DocsSlugPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const key = slug.join("/");
  const page = DOCS_CONTENT[key];

  if (!page) {
    return (
      <article>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-4 text-foreground-secondary">
          This documentation page doesn&apos;t exist yet.
        </p>
      </article>
    );
  }

  return (
    <article className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {page.title}
        </h1>
        <p className="mt-4 text-lg text-foreground-secondary leading-relaxed">
          {page.description}
        </p>
      </div>
      {page.content}
    </article>
  );
}
