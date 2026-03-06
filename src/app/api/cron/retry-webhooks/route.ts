import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { decryptField } from "@/lib/crypto/field-cipher";

/**
 * Retry schedule: exponential backoff
 * Attempt 1: after 30s
 * Attempt 2: after 2min
 * Attempt 3: after 10min
 * Attempt 4: after 1h
 * Attempt 5: after 6h
 */
const RETRY_DELAYS_MS = [30_000, 120_000, 600_000, 3_600_000, 21_600_000];
const MAX_RETRIES = 5;

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron endpoint for retrying failed webhook deliveries with exponential backoff.
 * Should be called every 30-60 seconds.
 */
export async function GET(req: Request) {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const authHeader = req.headers.get("authorization");
  const expected = Buffer.from(`Bearer ${CRON_SECRET}`);
  const actual = Buffer.from(authHeader || "");
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find failed webhooks eligible for retry.
    // Two cases:
    //   1. Initial failures (retryCount=0, nextRetryAt=null) — created > 30s ago
    //   2. Scheduled retries (nextRetryAt <= now, retryCount < MAX_RETRIES)
    const firstRetryThreshold = new Date(now.getTime() - RETRY_DELAYS_MS[0]);

    const eligibleLogs = await db.webhookLog.findMany({
      where: {
        success: false,
        retryCount: { lt: MAX_RETRIES },
        OR: [
          // Initial failures: never retried, enough time since creation
          {
            retryCount: 0,
            nextRetryAt: null,
            createdAt: { lte: firstRetryThreshold },
          },
          // Scheduled retries: nextRetryAt has passed
          {
            nextRetryAt: { not: null, lte: now },
          },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 50, // Process up to 50 per cycle to avoid timeouts
    });

    if (eligibleLogs.length === 0) {
      return NextResponse.json({ retried: 0, succeeded: 0, failed: 0 });
    }

    let succeeded = 0;
    let failed = 0;

    for (const log of eligibleLogs) {
      const newRetryCount = log.retryCount + 1;

      // Look up the user's current webhook secret for HMAC signing
      const user = await db.user.findUnique({
        where: { id: log.userId },
        select: { webhookSecret: true },
      });

      // Re-sign with a fresh timestamp and nonce for replay protection
      const nonce = crypto.randomBytes(16).toString("hex");
      const timestamp = Math.floor(Date.now() / 1000);

      // Inject updated timestamp and nonce into the stored payload
      let resignedPayload: string;
      try {
        const parsed = JSON.parse(log.payload);
        parsed.timestamp = timestamp;
        parsed.nonce = nonce;
        resignedPayload = JSON.stringify(parsed);
      } catch {
        resignedPayload = log.payload;
      }

      // Decrypt the stored webhook secret before using it for HMAC signing
      const rawSecret = user?.webhookSecret
        ? decryptField(user.webhookSecret)
        : null;

      // Re-sign the payload with current secret — timestamp prepended for replay protection
      const signature = rawSecret
        ? crypto
            .createHmac("sha256", rawSecret)
            .update(`${timestamp}.${resignedPayload}`)
            .digest("hex")
        : undefined;

      const startTime = Date.now();
      let status = 0;
      let success = false;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout for retries

        const res = await fetch(log.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(signature && { "X-VoidPay-Signature": signature }),
            "X-VoidPay-Timestamp": String(timestamp),
            "X-VoidPay-Retry": String(newRetryCount),
          },
          body: resignedPayload,
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

      if (success) {
        // Mark the original log as succeeded on retry
        await db.webhookLog.update({
          where: { id: log.id },
          data: {
            success: true,
            status,
            duration,
            retryCount: newRetryCount,
            nextRetryAt: null,
          },
        });
        succeeded++;
      } else {
        // Calculate next retry time (or mark as exhausted)
        const nextDelay =
          newRetryCount < MAX_RETRIES
            ? RETRY_DELAYS_MS[newRetryCount] // delay for the NEXT attempt
            : null;

        await db.webhookLog.update({
          where: { id: log.id },
          data: {
            status,
            duration,
            retryCount: newRetryCount,
            nextRetryAt: nextDelay
              ? new Date(Date.now() + nextDelay)
              : null, // null = exhausted, no more retries
          },
        });
        failed++;
      }
    }

    return NextResponse.json({
      retried: eligibleLogs.length,
      succeeded,
      failed,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Webhook retry failed";
    console.error("[cron/retry-webhooks]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
