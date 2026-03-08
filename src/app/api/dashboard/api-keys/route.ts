// @ts-nocheck
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function buildPrefix(key: string): string {
  const prefix = key.slice(0, 8); // "sk_live_" or "pk_live_"
  return `${prefix}${"····".repeat(3)}${key.slice(-4)}`;
}

const createKeySchema = z.object({
  name: z.string().min(1).max(50).optional(),
});

/** List all API keys (masked) */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keys = await db.apiKey.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        keyPrefix: true,
        lastUsed: true,
        createdAt: true,
      },
    });

    const masked = keys.map((k) => ({
      id: k.id,
      name: k.name,
      type: k.type,
      maskedKey: k.keyPrefix,
      lastUsed: k.lastUsed,
      createdAt: k.createdAt,
    }));

    return NextResponse.json(masked);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** Create a new API key pair (secret + publishable) — returns full keys ONCE */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = createKeySchema.safeParse(body);
    const name = parsed.success ? parsed.data.name || "Default" : "Default";

    // Generate both keys
    const rawSecretKey = `sk_live_${crypto.randomBytes(32).toString("hex")}`;
    const rawPublishableKey = `pk_live_${crypto.randomBytes(32).toString("hex")}`;

    const skHash = hashKey(rawSecretKey);
    const pkHash = hashKey(rawPublishableKey);

    // Create both in a transaction
    const [secretRecord, publishableRecord] = await db.$transaction([
      db.apiKey.create({
        data: {
          userId: session.user.id,
          name,
          type: "secret",
          keyHash: skHash,
          keyPrefix: buildPrefix(rawSecretKey),
          scopes: ["payments:read", "payments:write"],
        },
      }),
      db.apiKey.create({
        data: {
          userId: session.user.id,
          name: `${name} (publishable)`,
          type: "publishable",
          keyHash: pkHash,
          keyPrefix: buildPrefix(rawPublishableKey),
          scopes: ["payments:create"],
        },
      }),
    ]);

    // Return both keys — shown only once
    return NextResponse.json(
      {
        secretKey: {
          id: secretRecord.id,
          name: secretRecord.name,
          type: "secret",
          key: rawSecretKey,
          createdAt: secretRecord.createdAt,
        },
        publishableKey: {
          id: publishableRecord.id,
          name: publishableRecord.name,
          type: "publishable",
          key: rawPublishableKey,
          createdAt: publishableRecord.createdAt,
        },
        message: "Copy both keys now. The secret key will not be shown again.",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
