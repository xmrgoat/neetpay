import { z } from "zod";
import { authenticateRequest, assertScope } from "@/lib/api/auth";
import { authenticatedLimiter } from "@/lib/api/rate-limit";
import { apiSuccess, apiError } from "@/lib/api/response";
import { db } from "@/lib/db";

const VALID_STATUSES = [
  "pending",
  "confirming",
  "paid",
  "expired",
  "failed",
  "underpaid",
  "refunded",
] as const;

const VALID_SORT_BY = ["create_date", "pay_date", "amount"] as const;
const VALID_SORT_TYPE = ["asc", "desc"] as const;

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(VALID_STATUSES).optional(),
  currency: z.string().optional(),
  from_date: z.coerce.number().int().optional(),
  to_date: z.coerce.number().int().optional(),
  sort_by: z.enum(VALID_SORT_BY).default("create_date"),
  sort_type: z.enum(VALID_SORT_TYPE).default("desc"),
});

const SORT_FIELD_MAP: Record<string, string> = {
  create_date: "createdAt",
  pay_date: "paidAt",
  amount: "amount",
};

export async function GET(req: Request) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return apiError(401, "Unauthorized");
    }

    if (!assertScope(authResult, "payments:read")) {
      return apiError(403, "Insufficient permissions", "insufficient_scope");
    }

    if (authResult.keyType === "publishable") {
      return apiError(403, "Publishable keys cannot list payments", "insufficient_scope");
    }

    const limit = authenticatedLimiter(authResult.userId);
    if (!limit.success) {
      return apiError(429, "Rate limit exceeded");
    }

    const url = new URL(req.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());
    const parsed = listQuerySchema.safeParse(rawParams);

    if (!parsed.success) {
      return apiError(400, parsed.error.issues[0].message, "validation_error");
    }

    const { page, size, status, currency, from_date, to_date, sort_by, sort_type } =
      parsed.data;

    // Build Prisma where clause
    const where: Record<string, unknown> = {
      userId: authResult.userId,
    };

    if (status) {
      where.status = status;
    }

    if (currency) {
      where.payCurrency = currency;
    }

    if (from_date || to_date) {
      const createdAtFilter: Record<string, Date> = {};
      if (from_date) {
        createdAtFilter.gte = new Date(from_date * 1000);
      }
      if (to_date) {
        createdAtFilter.lte = new Date(to_date * 1000);
      }
      where.createdAt = createdAtFilter;
    }

    // Build orderBy
    const orderByField = SORT_FIELD_MAP[sort_by];
    const orderBy = { [orderByField]: sort_type };

    const skip = (page - 1) * size;

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where,
        orderBy,
        skip,
        take: size,
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
          description: true,
          expiresAt: true,
          paidAt: true,
          createdAt: true,
        },
      }),
      db.payment.count({ where }),
    ]);

    const lastPage = Math.max(1, Math.ceil(total / size));

    return apiSuccess(
      { list: payments, meta: { page, lastPage, total } },
      "Payments retrieved",
    );
  } catch {
    return apiError(500, "Internal server error");
  }
}
