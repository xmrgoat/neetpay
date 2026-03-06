import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runPollingCycle } from "@/lib/payment/poller";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron endpoint for polling BTC/TRON/XMR payments.
 * Should be called every 30-60 seconds.
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
    const result = await runPollingCycle();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Polling failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
