import { NextResponse } from "next/server";
import { getAcceptedCurrencies } from "@/lib/oxapay";

export async function GET() {
  try {
    const currencies = await getAcceptedCurrencies();
    return NextResponse.json(currencies);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch currencies" },
      { status: 500 }
    );
  }
}
