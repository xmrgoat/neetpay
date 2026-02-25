import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateWebhookHMAC } from "@/lib/oxapay";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("hmac") ?? "";

    if (!signature || !validateWebhookHMAC(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const data = JSON.parse(rawBody);
    const { trackId, status, payCurrency, payAmount, network, txID, address } =
      data;

    if (!trackId) {
      return NextResponse.json({ error: "Missing trackId" }, { status: 400 });
    }

    const payment = await db.payment.findUnique({
      where: { trackId },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const statusMap: Record<string, string> = {
      Waiting: "waiting",
      Confirming: "confirming",
      Confirmed: "confirming",
      Sending: "sending",
      Paid: "paid",
      Failed: "failed",
      Expired: "expired",
    };

    const mappedStatus = statusMap[status] ?? payment.status;

    await db.payment.update({
      where: { trackId },
      data: {
        status: mappedStatus,
        payCurrency: payCurrency ?? payment.payCurrency,
        payAmount: payAmount ? parseFloat(payAmount) : payment.payAmount,
        network: network ?? payment.network,
        txId: txID ?? payment.txId,
        payAddress: address ?? payment.payAddress,
      },
    });

    // If paid, upgrade user plan if this was a subscription payment
    if (mappedStatus === "paid") {
      const planAmount = payment.amount;
      let plan = "free";
      if (planAmount >= 29) plan = "pro";
      if (planAmount >= 99) plan = "enterprise";

      if (plan !== "free") {
        await db.subscription.create({
          data: {
            userId: payment.userId,
            plan,
            paymentId: payment.id,
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        await db.user.update({
          where: { id: payment.userId },
          data: { plan },
        });
      }
    }

    return new NextResponse("ok", { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
