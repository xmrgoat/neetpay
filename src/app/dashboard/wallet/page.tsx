import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { WalletMinimal } from "lucide-react";

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
        <WalletMinimal className="h-7 w-7 text-primary" />
      </div>
      <h1 className="font-heading text-lg font-semibold text-foreground">
        XMR Wallet
      </h1>
      <p className="text-sm text-muted mt-1 max-w-sm">
        Your Monero wallet balance and transaction history will appear here.
        This feature is coming soon.
      </p>
      <p className="text-xs text-muted/60 mt-4 font-mono">
        Powered by monero-wallet-rpc
      </p>
    </div>
  );
}
