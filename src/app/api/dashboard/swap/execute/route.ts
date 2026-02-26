import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createFixedShift } from "@/lib/swap/sideshift";
import { getDepositAddress } from "@/lib/wallet/wallet-service";
import { CHAIN_REGISTRY } from "@/lib/chains/registry";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { quoteId, settleAddress, refundAddress, toCurrency } = body as {
    quoteId?: string;
    settleAddress?: string;
    refundAddress?: string;
    toCurrency?: string;
  };

  if (!quoteId || !settleAddress) {
    return NextResponse.json(
      { error: "Missing required fields: quoteId, settleAddress" },
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

  const userIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "127.0.0.1";

  try {
    const shift = await createFixedShift({
      quoteId,
      settleAddress: resolvedAddress,
      refundAddress,
      userIp,
    });

    return NextResponse.json({
      shiftId: shift.id,
      depositAddress: shift.depositAddress,
      depositMemo: shift.depositMemo,
      depositAmount: shift.depositAmount,
      settleAmount: shift.settleAmount,
      rate: shift.rate,
      status: shift.status,
      expiresAt: shift.expiresAt,
      averageShiftSeconds: shift.averageShiftSeconds,
    });
  } catch (err) {
    console.error("[swap/execute]", err);
    const message = err instanceof Error ? err.message : "Shift creation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
