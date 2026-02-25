import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDepositAddress } from "@/lib/wallet/wallet-service";
import { CHAIN_REGISTRY } from "@/lib/chains/registry";
import type { WalletDepositInfo } from "@/types/wallet";

/**
 * POST /api/dashboard/wallet/deposit
 * Generate or retrieve a deposit address for a given currency.
 * Body: { currencyKey: string }
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { currencyKey } = body as { currencyKey?: string };

  if (!currencyKey) {
    return NextResponse.json(
      { error: "currencyKey is required" },
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
    const { address } = await getDepositAddress(
      session.user.id,
      entry.symbol,
      entry.chain,
    );

    const result: WalletDepositInfo = {
      address,
      chain: entry.chain,
      currencyKey,
      symbol: entry.symbol,
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate address";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
