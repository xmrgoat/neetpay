import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const webhookSchema = z.object({
  url: z.string().url(),
});

/** Save webhook URL */
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = webhookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid webhook URL" },
        { status: 400 }
      );
    }

    // Generate a webhook secret if one doesn't exist
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { webhookSecret: true },
    });

    const webhookSecret =
      user?.webhookSecret || `whsec_${crypto.randomBytes(24).toString("hex")}`;

    await db.user.update({
      where: { id: session.user.id },
      data: {
        webhookUrl: parsed.data.url,
        webhookSecret,
      },
    });

    return NextResponse.json({ success: true, webhookSecret });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
