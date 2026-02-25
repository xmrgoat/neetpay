import { NextResponse } from "next/server";
import { updatePriceCache } from "@/lib/price/coingecko";

const CRON_SECRET = process.env.CRON_SECRET || "";

export async function GET(req: Request) {
  if (CRON_SECRET) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
