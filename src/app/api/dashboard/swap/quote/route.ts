import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQuote, resolveProvider } from "@/lib/swap/router";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { from, to, amount } = body as {
    from?: string;
    to?: string;
    amount?: string;
  };

  if (!from || !to || !amount) {
    return NextResponse.json(
      { error: "Missing required fields: from, to, amount" },
      { status: 400 },
    );
  }

  const provider = resolveProvider(from, to);
  if (!provider) {
    return NextResponse.json(
      { error: `No swap provider supports ${from} → ${to}` },
      { status: 400 },
    );
  }

  try {
    const quote = await getQuote({ fromKey: from, toKey: to, amount });

    return NextResponse.json({
      provider: quote.provider,
      quoteId: quote.quoteId,
      rate: quote.rate,
      depositAmount: quote.depositAmount,
      settleAmount: quote.settleAmount,
      expiresAt: quote.expiresAt,
      min: quote.min ?? null,
      max: quote.max ?? null,
      fees: quote.fees,
    });
  } catch (err) {
    console.error("[swap/quote]", err);
    const message = err instanceof Error ? err.message : "Quote request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
