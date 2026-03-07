import type { Metadata } from "next";
import { Suspense } from "react";
import { API_URL } from "@/lib/constants";
import { PayClient } from "./pay-client";

interface PageProps {
  params: Promise<{ trackId: string }>;
}

interface InvoiceResponse {
  id: string;
  merchant_name: string | null;
  description: string | null;
  amount_xmr: number;
  amount_fiat: number | null;
  fiat_currency: string | null;
  subaddress: string;
  status: string;
  swap_provider: string | null;
  swap_order_id: string | null;
  deposit_address: string | null;
  deposit_chain: string | null;
  deposit_token: string | null;
  deposit_amount: number | null;
  tx_hash: string | null;
  confirmations: number;
  expires_at: string | null;
  created_at: string;
}

async function fetchInvoice(id: string): Promise<InvoiceResponse | null> {
  try {
    const res = await fetch(`${API_URL}/v1/invoices/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? json;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { trackId } = await params;
  const invoice = await fetchInvoice(trackId);

  if (!invoice) {
    return { title: "Invoice not found" };
  }

  const fiatLabel =
    invoice.amount_fiat && invoice.fiat_currency
      ? ` ($${invoice.amount_fiat} ${invoice.fiat_currency})`
      : "";

  return {
    title: `Pay ${invoice.amount_xmr} XMR${fiatLabel}`,
    robots: { index: false, follow: false },
  };
}

export default async function PayPage({ params }: PageProps) {
  const { trackId } = await params;
  const invoice = await fetchInvoice(trackId);

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-8"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <Suspense
        fallback={
          <div className="w-full max-w-[480px] text-center">
            <div className="animate-pulse-subtle font-mono text-sm" style={{ color: "#737373" }}>
              Loading...
            </div>
          </div>
        }
      >
        <PayClient invoice={invoice} invoiceId={trackId} />
      </Suspense>
    </main>
  );
}
