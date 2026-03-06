import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest, assertScope } from "@/lib/api/auth";
import { authenticatedLimiter } from "@/lib/api/rate-limit";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createPayment } from "@/lib/payment/engine";
import { getChainEntry } from "@/lib/chains/registry";
import { trackEvent } from "@/lib/analytics/tracker";
import { getClientIp, getGeoFromIp } from "@/lib/analytics/geo";
import { db } from "@/lib/db";

const createPaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  payCurrencyKey: z.string(),
  description: z.string().max(500).optional(),
  lifetimeMinutes: z.number().min(5).max(1440).optional(),
  callbackUrl: z.string().url().max(2048).optional(),
  returnUrl: z.string().url().max(2048).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
    .refine((m) => !m || JSON.stringify(m).length <= 4096, "Metadata too large (max 4KB)"),
});

function truncateIp(ip: string): string {
  // IPv4: remove last octet
  if (ip.includes('.')) {
    const parts = ip.split('.');
    parts[3] = '0';
    return parts.join('.');
  }
  // IPv6: remove last 4 groups
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':') + '::';
  }
  return ip;
}

export async function POST(req: Request) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return apiError(401, "Unauthorized");
    }

    if (!assertScope(authResult, "payments:write") && !assertScope(authResult, "payments:create")) {
      return apiError(403, "Insufficient permissions");
    }

    const limit = authenticatedLimiter(authResult.userId);
    if (!limit.success) {
      return apiError(429, "Rate limit exceeded", "rate_limited", {
        "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)),
      });
    }

    const body = await req.json();
    const parsed = createPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(400, parsed.error.issues[0].message, "validation_error");
    }

    // Validate currency key exists
    const entry = getChainEntry(parsed.data.payCurrencyKey);
    if (!entry) {
      return apiError(400, `Unsupported currency: ${parsed.data.payCurrencyKey}`, "invalid_currency");
    }

    // Idempotency-Key support — return cached response if key already used
    const idempotencyKey = req.headers.get("idempotency-key");
    if (idempotencyKey) {
      const existing = await db.idempotencyRecord.findUnique({
        where: { key: `${authResult.userId}:${idempotencyKey}` },
      });
      if (existing) {
        return NextResponse.json(existing.response as Record<string, unknown>, { status: 201 });
      }
    }

    const result = await createPayment({
      userId: authResult.userId,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      payCurrencyKey: parsed.data.payCurrencyKey,
      description: parsed.data.description,
      lifetimeMinutes: parsed.data.lifetimeMinutes,
      callbackUrl: parsed.data.callbackUrl,
      returnUrl: parsed.data.returnUrl,
      metadata: parsed.data.metadata,
      idempotencyKey: idempotencyKey ? `${authResult.userId}:${idempotencyKey}` : undefined,
    });

    // Store idempotency record (fire-and-forget)
    if (idempotencyKey) {
      db.idempotencyRecord.create({
        data: {
          key: `${authResult.userId}:${idempotencyKey}`,
          userId: authResult.userId,
          response: result as unknown as import("@prisma/client").Prisma.InputJsonValue,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      }).catch(() => {});
    }

    // Track analytics + store geo
    const ip = getClientIp(req);
    if (ip) {
      getGeoFromIp(ip).then((geo) => {
        db.payment.update({
          where: { trackId: result.trackId },
          data: { ipAddress: truncateIp(ip), country: geo.country },
        }).catch(() => {});
      });
    }

    trackEvent({
      userId: authResult.userId,
      type: "payment_created",
      paymentId: result.trackId,
      ip,
      userAgent: req.headers.get("user-agent"),
      referrer: req.headers.get("referer"),
    });

    return apiSuccess(result, "Payment created", 201);
  } catch (err) {
    console.error("[payment/create]", err);
    return apiError(500, "Internal server error");
  }
}
