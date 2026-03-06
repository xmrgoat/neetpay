import { getSupportedCurrencies, getCurrenciesBySymbol } from "@/lib/chains/registry";
import { apiSuccess } from "@/lib/api/response";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const grouped = searchParams.get("grouped") === "true";

  const currencies = grouped ? getCurrenciesBySymbol() : getSupportedCurrencies();
  return apiSuccess(currencies, "Currencies retrieved");
}
