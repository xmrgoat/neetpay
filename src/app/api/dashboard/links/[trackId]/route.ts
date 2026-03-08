// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** Delete a payment link by trackId. Only pending/expired payments can be deleted. */
export async function DELETE(
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
      select: { id: true, userId: true, status: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (payment.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow deleting pending or expired payments — paid/confirming should be kept
    if (!["pending", "expired", "failed"].includes(payment.status)) {
      return NextResponse.json(
        { error: `Cannot delete a payment with status "${payment.status}"` },
        { status: 400 }
      );
    }

    // Release associated wallet address first
    await db.walletAddress.updateMany({
      where: { paymentId: payment.id },
      data: { paymentId: null },
    });

    // Delete fee log if any
    await db.feeLog.deleteMany({
      where: { paymentId: payment.id },
    });

    // Delete the payment
    await db.payment.delete({
      where: { id: payment.id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
