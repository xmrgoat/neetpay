import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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
      select: {
        trackId: true,
        amount: true,
        currency: true,
        status: true,
        chain: true,
        payCurrency: true,
        payAmount: true,
        payAddress: true,
        network: true,
        txId: true,
        senderAddress: true,
        confirmations: true,
        requiredConfs: true,
        expiresAt: true,
        paidAt: true,
        createdAt: true,
        userId: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Verify ownership
    if (payment.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId: _, ...paymentData } = payment;
    return NextResponse.json(paymentData);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
