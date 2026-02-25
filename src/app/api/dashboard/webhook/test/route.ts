import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** Send a test webhook to the configured URL */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { webhookUrl: true, webhookSecret: true },
    });

    if (!user?.webhookUrl) {
      return NextResponse.json(
        { error: "No webhook URL configured" },
        { status: 400 }
      );
    }

    const payload = JSON.stringify({
      event: "test",
      message: "This is a test webhook from VoidPay",
      timestamp: new Date().toISOString(),
    });

    const signature = user.webhookSecret
      ? crypto
          .createHmac("sha256", user.webhookSecret)
          .update(payload)
          .digest("hex")
      : undefined;

    const startTime = Date.now();
    let status = 0;
    let success = false;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(user.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(signature && { "X-VoidPay-Signature": signature }),
        },
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      status = res.status;
      success = res.ok;
    } catch {
      status = 0;
      success = false;
    }

    const duration = Date.now() - startTime;

    // Log the test delivery
    await db.webhookLog.create({
      data: {
        userId: session.user.id,
        url: user.webhookUrl,
        payload,
        status,
        success,
        duration,
      },
    });

    return NextResponse.json({ success, status, duration });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
