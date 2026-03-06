import { db } from "@/lib/db";
import { unauthenticatedLimiter } from "@/lib/api/rate-limit";
import { apiSuccess, apiError } from "@/lib/api/response";

/**
 * Public status endpoint — no auth required.
 * Used by the checkout page to poll for payment status updates.
 * GET /api/v1/payment/[trackId]/status
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ trackId: string }> },
) {
  try {
    const { trackId } = await params;

    // IP-based rate limiting for public endpoint
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = unauthenticatedLimiter(ip);
    if (!limit.success) {
      return apiError(429, "Rate limit exceeded");
    }

    const payment = await db.payment.findUnique({
      where: { trackId },
      select: {
        status: true,
        confirmations: true,
        requiredConfs: true,
        txId: true,
        paidAt: true,
        expiresAt: true,
      },
    });

    if (!payment) {
      return apiError(404, "Not found");
    }

    // Server-side expiry: if still pending and past expiry time, mark expired
    if (
      payment.status === "pending" &&
      payment.expiresAt &&
      new Date(payment.expiresAt) < new Date()
    ) {
      await db.payment.update({
        where: { trackId },
        data: { status: "expired" },
      });

      return apiSuccess({
        status: "expired",
        confirmations: payment.confirmations,
        requiredConfs: payment.requiredConfs,
        txId: payment.txId,
        paidAt: payment.paidAt,
      });
    }

    return apiSuccess({
      status: payment.status,
      confirmations: payment.confirmations,
      requiredConfs: payment.requiredConfs,
      txId: payment.txId,
      paidAt: payment.paidAt,
    });
  } catch {
    return apiError(500, "Internal server error");
  }
}
