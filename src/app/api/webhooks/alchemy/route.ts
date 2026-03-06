import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkPaymentStatus } from "@/lib/payment/engine";

const ALCHEMY_SIGNING_KEY = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY || "";

/**
 * Validate Alchemy webhook signature.
 */
function validateAlchemySignature(body: string, signature: string): boolean {
  if (!ALCHEMY_SIGNING_KEY) return false;

  const hmac = crypto
    .createHmac("sha256", ALCHEMY_SIGNING_KEY)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(hmac, "hex"),
    Buffer.from(signature, "hex")
  );
}

/**
 * Alchemy Address Activity Webhook handler.
 * Receives notifications when transactions are sent to our deposit addresses.
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-alchemy-signature") ?? "";

    if (!ALCHEMY_SIGNING_KEY) {
      return NextResponse.json({ error: "Webhook signing not configured" }, { status: 503 });
    }
    if (!validateAlchemySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const data = JSON.parse(rawBody);

    // Alchemy Address Activity webhook payload
    const activities = data.event?.activity || [];

    for (const activity of activities) {
      const toAddress = activity.toAddress?.toLowerCase();
      if (!toAddress) continue;

      // Look up payment by deposit address
      const payment = await db.payment.findFirst({
        where: {
          payAddress: toAddress,
          status: { in: ["pending", "confirming"] },
        },
        select: { id: true },
      });

      if (payment) {
        await checkPaymentStatus(payment.id);
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
