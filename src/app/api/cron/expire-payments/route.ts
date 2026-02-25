import { NextResponse } from "next/server";
import { expirePayments } from "@/lib/payment/engine";

const CRON_SECRET = process.env.CRON_SECRET || "";

/**
 * Cron endpoint for expiring timed-out payments.
 * Should be called every 1-5 minutes.
 */
export async function GET(req: Request) {
  if (CRON_SECRET) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const count = await expirePayments();
    return NextResponse.json({ expired: count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Expiration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
