import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getChainEntry } from "@/lib/chains/registry";

const schema = z.object({
  xmrSettlementAddress: z.string().min(1).max(200).nullable(),
  autoForwardEnabled: z.boolean(),
  minForwardAmount: z.number().min(0).max(100).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      xmrSettlementAddress: true,
      autoForwardEnabled: true,
      platformFeePercent: true,
      minForwardAmount: true,
    },
  });

  return NextResponse.json(user ?? {});
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { xmrSettlementAddress, autoForwardEnabled, minForwardAmount } = parsed.data;

  // Validate XMR address if provided
  if (xmrSettlementAddress) {
    const xmrEntry = getChainEntry("XMR");
    if (!xmrEntry?.provider.validateAddress(xmrSettlementAddress)) {
      return NextResponse.json(
        { error: "Invalid Monero address" },
        { status: 400 }
      );
    }
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: {
      xmrSettlementAddress: xmrSettlementAddress || null,
      autoForwardEnabled,
      ...(minForwardAmount !== undefined && { minForwardAmount }),
    },
    select: {
      xmrSettlementAddress: true,
      autoForwardEnabled: true,
      platformFeePercent: true,
      minForwardAmount: true,
    },
  });

  return NextResponse.json(user);
}
