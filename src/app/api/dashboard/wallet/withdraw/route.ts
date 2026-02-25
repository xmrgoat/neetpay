import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withdraw } from "@/lib/wallet/wallet-service";
import { CHAIN_REGISTRY } from "@/lib/chains/registry";
import type { WalletWithdrawRequest, WalletWithdrawResponse } from "@/types/wallet";

/**
 * POST /api/dashboard/wallet/withdraw
 * Withdraw crypto to an external address.
 * Body: { currencyKey: string, address: string, amount: number }
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { currencyKey, address, amount } = body as WalletWithdrawRequest;

  if (!currencyKey || !address || !amount || amount <= 0) {
    return NextResponse.json(
      { error: "currencyKey, address, and a positive amount are required" },
      { status: 400 },
    );
  }

  const entry = CHAIN_REGISTRY[currencyKey];
  if (!entry) {
    return NextResponse.json(
      { error: `Unsupported currency: ${currencyKey}` },
      { status: 400 },
    );
  }

  try {
    const result = await withdraw(
      session.user.id,
      entry.symbol,
      entry.chain,
      address,
      amount,
    );

    const response: WalletWithdrawResponse = {
      success: true,
      txHash: result.txHash,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Withdrawal failed";
    const response: WalletWithdrawResponse = {
      success: false,
      error: message,
    };
    return NextResponse.json(response, { status: 400 });
  }
}
