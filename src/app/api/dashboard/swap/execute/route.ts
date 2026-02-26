import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createFixedShift } from "@/lib/swap/sideshift";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { quoteId, settleAddress, refundAddress } = body as {
    quoteId?: string;
    settleAddress?: string;
    refundAddress?: string;
  };

  if (!quoteId || !settleAddress) {
    return NextResponse.json(
      { error: "Missing required fields: quoteId, settleAddress" },
      { status: 400 },
    );
  }

  const userIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "127.0.0.1";

  try {
    const shift = await createFixedShift({
      quoteId,
      settleAddress,
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
