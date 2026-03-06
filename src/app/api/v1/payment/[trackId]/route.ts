import { authenticateRequest, assertScope } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return apiError(401, "Unauthorized");
    }

    if (!assertScope(authResult, "payments:read")) {
      return apiError(403, "Insufficient permissions", "insufficient_scope");
    }

    if (authResult.keyType === "publishable") {
      return apiError(403, "Publishable keys cannot access payment details", "insufficient_scope");
    }

    const { trackId } = await params;

    const payment = await db.payment.findFirst({
      where: { trackId, userId: authResult.userId },
      select: {
        trackId: true,
        amount: true,
        currency: true,
        status: true,
        chain: true,
        payCurrency: true,
        payAmount: true,
        payAddress: true,
        network: true,
        txId: true,
        senderAddress: true,
        confirmations: true,
        requiredConfs: true,
        expiresAt: true,
        paidAt: true,
        createdAt: true,
      },
    });

    if (!payment) {
      return apiError(404, "Payment not found");
    }

    return apiSuccess(payment);
  } catch {
    return apiError(500, "Internal server error");
  }
}
