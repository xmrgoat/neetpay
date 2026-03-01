import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSwapStatus } from "@/lib/swap/router";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const swapId = req.nextUrl.searchParams.get("swapId");
  const provider = req.nextUrl.searchParams.get("provider") as
    | "thorchain"
    | "oneinch"
    | "sideshift"
    | null;

  if (!swapId || !provider) {
    return NextResponse.json(
      { error: "Missing swapId or provider parameter" },
      { status: 400 },
    );
  }

  try {
    const status = await getSwapStatus(swapId, provider);

    return NextResponse.json({
      swapId: status.swapId,
      provider: status.provider,
      status: status.status,
      depositAmount: status.depositAmount,
      settleAmount: status.settleAmount,
      settleHash: status.settleHash,
      settleAddress: status.settleAddress,
    });
  } catch (err) {
    console.error("[swap/status]", err);
    const message = err instanceof Error ? err.message : "Status check failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
