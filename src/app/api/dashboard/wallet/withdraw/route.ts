import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { withdraw } from "@/lib/wallet/wallet-service";
import { CHAIN_REGISTRY } from "@/lib/chains/registry";
import type { WalletWithdrawResponse } from "@/types/wallet";

const withdrawSchema = z.object({
  currencyKey: z.string().min(1).max(20),
  address: z.string().min(10).max(200),
  amount: z.number().positive(),
});

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
  const parsed = withdrawSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }
  const { currencyKey, address, amount } = parsed.data;

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
