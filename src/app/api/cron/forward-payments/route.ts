import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { processForwardingQueue } from "@/lib/payment/forwarder";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron endpoint for auto-forwarding confirmed XMR payments to merchant wallets.
 * Should be called every 2-5 minutes.
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
    const result = await processForwardingQueue();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Forwarding failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
