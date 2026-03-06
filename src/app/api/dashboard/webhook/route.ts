import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptField } from "@/lib/crypto/field-cipher";

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

    // If a secret already exists (encrypted blob), keep it — don't rotate.
    // If not, generate a new raw secret, encrypt it, and store the encrypted form.
    const rawSecret = user?.webhookSecret
      ? null // already set — don't regenerate
      : `whsec_${crypto.randomBytes(24).toString("hex")}`;

    const updateData: { webhookUrl: string; webhookSecret?: string } = {
      webhookUrl: parsed.data.url,
    };
    if (rawSecret) {
      updateData.webhookSecret = encryptField(rawSecret);
    }

    await db.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    // Return the raw secret only when first generated (shown once to the user).
    // If the secret already existed, return null — the UI already has the masked version.
    return NextResponse.json({ success: true, webhookSecret: rawSecret });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
