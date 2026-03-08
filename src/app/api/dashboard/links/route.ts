// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/constants";

/** List all payment links for the current user (for refresh). */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payments = await db.payment.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        trackId: true,
        amount: true,
        currency: true,
        payCurrency: true,
        description: true,
        status: true,
        createdAt: true,
      },
    });

    const links = payments.map((p) => ({
      trackId: p.trackId,
      url: `${SITE_URL}/pay/${p.trackId}`,
      amount: p.amount,
      currency: p.currency,
      payCurrency: p.payCurrency ?? "BTC",
      description: p.description,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json(links);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
