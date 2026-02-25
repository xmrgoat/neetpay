import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPaymentStatus } from "@/lib/oxapay";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { trackId } = await params;

    const payment = await db.payment.findUnique({
      where: { trackId },
    });

    if (!payment || payment.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const oxaStatus = await getPaymentStatus(trackId);

    return NextResponse.json({
      trackId: payment.trackId,
      amount: payment.amount,
      currency: payment.currency,
      status: oxaStatus.status ?? payment.status,
      payCurrency: oxaStatus.payCurrency ?? payment.payCurrency,
      payAmount: oxaStatus.payAmount ?? payment.payAmount,
      payAddress: oxaStatus.payAddress ?? payment.payAddress,
      network: oxaStatus.network ?? payment.network,
      txId: oxaStatus.txId ?? payment.txId,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
