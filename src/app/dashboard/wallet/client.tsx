"use client";

/**
 * WalletPageClient — placeholder for XMR-only wallet.
 * Previously handled multi-chain wallet with send/receive/swap panels.
 * Will be rebuilt once Rust backend + monero-wallet-rpc integration is ready.
 */

import { WalletMinimal } from "lucide-react";

export function WalletPageClient() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
        <WalletMinimal className="h-7 w-7 text-primary" />
      </div>
      <h1 className="font-heading text-lg font-semibold text-foreground">
        XMR Wallet
      </h1>
      <p className="text-sm text-muted mt-1 max-w-sm">
        Coming soon. Your Monero balance and transactions will appear here.
      </p>
    </div>
  );
}
