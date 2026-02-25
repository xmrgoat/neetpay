import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createPayment } from "@/lib/payment/engine";
import { getChainEntry } from "@/lib/chains/registry";
import { trackEvent } from "@/lib/analytics/tracker";
import { getClientIp, getGeoFromIp } from "@/lib/analytics/geo";
import { db } from "@/lib/db";

const createPaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  payCurrencyKey: z.string(),
  description: z.string().optional(),
  lifetimeMinutes: z.number().min(5).max(1440).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Validate currency key exists
    const entry = getChainEntry(parsed.data.payCurrencyKey);
    if (!entry) {
      return NextResponse.json(
        { error: `Unsupported currency: ${parsed.data.payCurrencyKey}` },
        { status: 400 }
      );
    }

    const result = await createPayment({
      userId: session.user.id,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      payCurrencyKey: parsed.data.payCurrencyKey,
      description: parsed.data.description,
      lifetimeMinutes: parsed.data.lifetimeMinutes,
    });

    // Track analytics + store geo
    const ip = getClientIp(req);
    if (ip) {
      getGeoFromIp(ip).then((geo) => {
        db.payment.update({
          where: { trackId: result.trackId },
          data: { ipAddress: ip, country: geo.country },
        }).catch(() => {});
      });
    }

    trackEvent({
      userId: session.user.id,
      type: "payment_created",
      paymentId: result.trackId,
      ip,
      userAgent: req.headers.get("user-agent"),
      referrer: req.headers.get("referer"),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
