import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getShiftStatus } from "@/lib/swap/sideshift";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shiftId = req.nextUrl.searchParams.get("shiftId");
  if (!shiftId) {
    return NextResponse.json({ error: "Missing shiftId parameter" }, { status: 400 });
  }

  try {
    const status = await getShiftStatus(shiftId);

    return NextResponse.json({
      shiftId: status.id,
      status: status.status,
      depositAddress: status.depositAddress,
      settleAddress: status.settleAddress,
      depositAmount: status.depositAmount,
      settleAmount: status.settleAmount,
      rate: status.rate,
      expiresAt: status.expiresAt,
      depositReceivedAt: status.depositReceivedAt,
      settleHash: status.settleHash,
    });
  } catch (err) {
    console.error("[swap/status]", err);
    const message = err instanceof Error ? err.message : "Status check failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
