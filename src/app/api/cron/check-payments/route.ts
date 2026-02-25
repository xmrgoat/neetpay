import { NextResponse } from "next/server";
import { runPollingCycle } from "@/lib/payment/poller";

const CRON_SECRET = process.env.CRON_SECRET || "";

/**
 * Cron endpoint for polling BTC/TRON/XMR payments.
 * Should be called every 30-60 seconds.
 */
export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized calls
  if (CRON_SECRET) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runPollingCycle();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Polling failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
