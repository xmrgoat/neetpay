import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createInvoice } from "@/lib/oxapay";

const createInvoiceSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  description: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createInvoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/webhook`;

    const result = await createInvoice({
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      description: parsed.data.description,
      callbackUrl,
      lifeTime: 30,
    });

    if (result.result !== 100 || !result.trackId) {
      return NextResponse.json(
        { error: result.message || "Failed to create invoice" },
        { status: 502 }
      );
    }

    await db.payment.create({
      data: {
        userId: session.user.id,
        trackId: result.trackId,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        description: parsed.data.description,
        status: "waiting",
      },
    });

    return NextResponse.json({
      trackId: result.trackId,
      payLink: result.payLink,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
