"use client";

import { useState } from "react";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BalanceCard } from "@/components/dashboard/wallet/balance-card";
import { AssetList } from "@/components/dashboard/wallet/asset-list";
import { SendDialog } from "@/components/dashboard/wallet/send-dialog";
import { ReceiveDialog } from "@/components/dashboard/wallet/receive-dialog";
import { WalletTransactions } from "@/components/dashboard/wallet/wallet-transactions";
import type { WalletBalance, WalletAsset } from "@/types/wallet";

interface WalletPageClientProps {
  wallet: WalletBalance;
}

export function WalletPageClient({ wallet }: WalletPageClientProps) {
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [selectedAssetKey, setSelectedAssetKey] = useState<string | undefined>();

  const handleSend = (asset?: WalletAsset) => {
    setSelectedAssetKey(asset?.key);
    setSendOpen(true);
  };

  const handleReceive = (asset?: WalletAsset) => {
    setSelectedAssetKey(asset?.key);
    setReceiveOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-lg font-semibold text-foreground">
            Wallet
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Manage your crypto balances
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleReceive()}
          >
            <ArrowDownLeft size={14} />
            Receive
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSend()}
          >
            <ArrowUpRight size={14} />
            Send
          </Button>
        </div>
      </div>

      {/* Balance card */}
      <BalanceCard balance={wallet} />

      {/* Asset table */}
      <AssetList
        assets={wallet.assets}
        onSend={(asset) => handleSend(asset)}
        onReceive={(asset) => handleReceive(asset)}
      />

      {/* Transaction history */}
      <WalletTransactions />

      {/* Dialogs */}
      <SendDialog
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        assets={wallet.assets}
        initialAssetKey={selectedAssetKey}
      />
      <ReceiveDialog
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        assets={wallet.assets}
        initialAssetKey={selectedAssetKey}
      />
    </div>
  );
}
