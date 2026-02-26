import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQuote, getPairInfo, toSideShift } from "@/lib/swap/sideshift";

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

  if (!toSideShift(from)) {
    return NextResponse.json({ error: `Unsupported currency: ${from}` }, { status: 400 });
  }
  if (!toSideShift(to)) {
    return NextResponse.json({ error: `Unsupported currency: ${to}` }, { status: 400 });
  }

  const userIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "127.0.0.1";

  try {
    // Fetch pair limits first to validate amount before requesting a quote
    const pair = await getPairInfo(from, to);
    const depositNum = parseFloat(amount);
    const min = parseFloat(pair.min);
    const max = parseFloat(pair.max);

    if (depositNum < min || depositNum > max) {
      return NextResponse.json({
        quoteId: null,
        rate: pair.rate,
        depositAmount: amount,
        settleAmount: null,
        expiresAt: null,
        min: pair.min,
        max: pair.max,
        error: depositNum < min ? "Amount below minimum" : "Amount above maximum",
      });
    }

    const quote = await getQuote({ fromKey: from, toKey: to, depositAmount: amount, userIp });

    return NextResponse.json({
      quoteId: quote.id,
      rate: quote.rate,
      depositAmount: quote.depositAmount,
      settleAmount: quote.settleAmount,
      expiresAt: quote.expiresAt,
      min: pair.min,
      max: pair.max,
    });
  } catch (err) {
    console.error("[swap/quote]", err);
    const message = err instanceof Error ? err.message : "Quote request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
