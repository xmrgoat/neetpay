import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTransactionHistory } from "@/lib/wallet/wallet-service";

/**
 * GET /api/dashboard/wallet/transactions?page=1&limit=20&type=withdrawal
 * Returns paginated wallet transaction history.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const type = searchParams.get("type") ?? undefined;

  const result = await getTransactionHistory(session.user.id, {
    page,
    limit,
    type,
  });

  return NextResponse.json({
    transactions: result.transactions,
    total: result.total,
    page,
    pages: Math.ceil(result.total / limit),
  });
}
