import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { updatePriceCache } from "@/lib/price/coingecko";

const CRON_SECRET = process.env.CRON_SECRET;

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
    const count = await updatePriceCache();
    return NextResponse.json({ updated: count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Price update failed";
    console.error("[cron/update-prices]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
