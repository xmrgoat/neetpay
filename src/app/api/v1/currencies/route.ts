import { NextResponse } from "next/server";
import { getSupportedCurrencies, getCurrenciesBySymbol } from "@/lib/chains/registry";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const grouped = searchParams.get("grouped") === "true";

  if (grouped) {
    return NextResponse.json(getCurrenciesBySymbol());
  }

  return NextResponse.json(getSupportedCurrencies());
}
