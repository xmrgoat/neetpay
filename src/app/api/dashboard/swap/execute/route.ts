import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { executeSwap } from "@/lib/swap/router";
import { getDepositAddress } from "@/lib/wallet/wallet-service";
import { CHAIN_REGISTRY } from "@/lib/chains/registry";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { quoteId, settleAddress, refundAddress, toCurrency, provider } = body as {
    quoteId?: string;
    settleAddress?: string;
    refundAddress?: string;
    toCurrency?: string;
    provider?: "thorchain" | "oneinch" | "sideshift";
  };

  if (!quoteId || !settleAddress || !provider) {
    return NextResponse.json(
      { error: "Missing required fields: quoteId, settleAddress, provider" },
      { status: 400 },
    );
  }

  // Resolve "self" → user's own wallet address for the target currency
  let resolvedAddress = settleAddress;
  if (settleAddress === "self") {
    if (!toCurrency) {
      return NextResponse.json(
        { error: "toCurrency required when settleAddress is 'self'" },
        { status: 400 },
      );
    }

    const entry = CHAIN_REGISTRY[toCurrency];
    if (!entry) {
      return NextResponse.json(
        { error: `Unsupported currency: ${toCurrency}` },
        { status: 400 },
      );
    }

    try {
      const { address } = await getDepositAddress(
        session.user.id,
        entry.symbol,
        entry.chain,
      );
      resolvedAddress = address;
    } catch (err) {
      console.error("[swap/execute] address resolution failed:", err);
      return NextResponse.json(
        { error: "Failed to resolve wallet address" },
        { status: 500 },
      );
    }
  }

  try {
    const result = await executeSwap({
      quoteId,
      settleAddress: resolvedAddress,
      refundAddress,
      provider,
    });

    return NextResponse.json({
      swapId: result.swapId,
      provider: result.provider,
      depositAddress: result.depositAddress,
      depositMemo: result.depositMemo,
      depositAmount: result.depositAmount,
      settleAmount: result.settleAmount,
      rate: result.rate,
      status: result.status,
      expiresAt: result.expiresAt,
    });
  } catch (err) {
    console.error("[swap/execute]", err);
    const message = err instanceof Error ? err.message : "Swap execution failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
