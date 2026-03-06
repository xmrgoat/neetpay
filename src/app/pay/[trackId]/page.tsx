import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SUPPORTED_CRYPTOS } from "@/lib/constants";
import { CheckoutClient } from "./checkout-client";

interface PageProps {
  params: Promise<{ trackId: string }>;
}

// Block explorer URLs by chain
const EXPLORER_TX_URLS: Record<string, string> = {
  ethereum: "https://etherscan.io/tx/",
  bitcoin: "https://mempool.space/tx/",
  solana: "https://solscan.io/tx/",
  monero: "https://xmrchain.net/tx/",
  tron: "https://tronscan.org/#/transaction/",
  bsc: "https://bscscan.com/tx/",
  polygon: "https://polygonscan.com/tx/",
  arbitrum: "https://arbiscan.io/tx/",
  optimism: "https://optimistic.etherscan.io/tx/",
  avalanche: "https://snowtrace.io/tx/",
  litecoin: "https://blockchair.com/litecoin/transaction/",
  dogecoin: "https://blockchair.com/dogecoin/transaction/",
};

function getCryptoName(symbol: string): string {
  const entry = SUPPORTED_CRYPTOS.find((c) => c.symbol === symbol);
  return entry?.name ?? symbol;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { trackId } = await params;

  const payment = await db.payment.findUnique({
    where: { trackId },
    select: { amount: true, currency: true, payCurrency: true },
  });

  if (!payment) {
    return { title: "Payment not found" };
  }

  const cryptoName = payment.payCurrency
    ? getCryptoName(payment.payCurrency)
    : "";

  return {
    title: `Pay ${payment.amount} ${payment.currency}${cryptoName ? ` in ${cryptoName}` : ""}`,
    robots: { index: false, follow: false },
  };
}

export default async function PayPage({ params }: PageProps) {
  const { trackId } = await params;

  const payment = await db.payment.findUnique({
    where: { trackId },
    select: {
      trackId: true,
      userId: true,
      amount: true,
      currency: true,
      status: true,
      description: true,
      chain: true,
      payCurrency: true,
      payAmount: true,
      payAddress: true,
      network: true,
      txId: true,
      confirmations: true,
      requiredConfs: true,
      expiresAt: true,
      paidAt: true,
      createdAt: true,
      returnUrl: true,
      metadata: true,
    },
  });

  if (!payment) {
    notFound();
  }

  // Load merchant branding
  const branding = await db.merchantBranding.findUnique({
    where: { userId: payment.userId },
    select: {
      logoUrl: true,
      brandName: true,
      primaryColor: true,
      hideNeetpay: true,
    },
  });

  // Determine block explorer base URL
  const explorerTxUrl = payment.chain
    ? EXPLORER_TX_URLS[payment.chain] ?? null
    : null;

  // Get crypto display name
  const cryptoName = payment.payCurrency
    ? getCryptoName(payment.payCurrency)
    : null;

  return (
    <main className="min-h-dvh flex items-center justify-center bg-background px-4 py-8">
      <Suspense fallback={null}>
        <CheckoutClient
          payment={{
            trackId: payment.trackId,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            description: payment.description,
            chain: payment.chain,
            payCurrency: payment.payCurrency,
            payAmount: payment.payAmount,
            payAddress: payment.payAddress,
            network: payment.network,
            txId: payment.txId,
            confirmations: payment.confirmations,
            requiredConfs: payment.requiredConfs,
            expiresAt: payment.expiresAt?.toISOString() ?? null,
            paidAt: payment.paidAt?.toISOString() ?? null,
            createdAt: payment.createdAt.toISOString(),
            returnUrl: payment.returnUrl,
            metadata: payment.metadata as Record<string, unknown> | null,
          }}
          branding={branding}
          cryptoName={cryptoName}
          explorerTxUrl={explorerTxUrl}
        />
      </Suspense>
    </main>
  );
}
