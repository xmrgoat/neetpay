import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { expirePayments } from "@/lib/payment/engine";
import { db } from "@/lib/db";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron endpoint for expiring timed-out payments.
 * Should be called every 1-5 minutes.
 */
export async function GET(req: Request) {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const authHeader = req.headers.get("authorization");
  const expected = Buffer.from(`Bearer ${CRON_SECRET}`);
  const actual = Buffer.from(authHeader || "");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await expirePayments();

    // Cleanup expired webhook logs and idempotency records
    const now = new Date();
    await Promise.all([
      db.webhookLog.deleteMany({ where: { expiresAt: { lt: now } } }),
      db.idempotencyRecord.deleteMany({ where: { expiresAt: { lt: now } } }),
    ]);

    return NextResponse.json({ expired: count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Expiration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
