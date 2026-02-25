import { db } from "@/lib/db";

/**
 * Get overview stats for the dashboard home page.
 */
export async function getOverviewStats(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalRevenue,
    monthRevenue,
    lastMonthRevenue,
    monthPayments,
    lastMonthPayments,
    totalPayments,
    paidPayments,
  ] = await Promise.all([
    db.payment.aggregate({
      where: { userId, status: "paid" },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { userId, status: "paid", createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: {
        userId,
        status: "paid",
        createdAt: { gte: startOfLastMonth, lt: startOfMonth },
      },
      _sum: { amount: true },
    }),
    db.payment.count({
      where: { userId, createdAt: { gte: startOfMonth } },
    }),
    db.payment.count({
      where: { userId, createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
    }),
    db.payment.count({ where: { userId } }),
    db.payment.count({ where: { userId, status: "paid" } }),
  ]);

  const totalRev = totalRevenue._sum.amount || 0;
  const monthRev = monthRevenue._sum.amount || 0;
  const lastMonthRev = lastMonthRevenue._sum.amount || 0;
  const revenueChange = lastMonthRev > 0
    ? Math.round(((monthRev - lastMonthRev) / lastMonthRev) * 100)
    : monthRev > 0 ? 100 : 0;

  const paymentChange = lastMonthPayments > 0
    ? Math.round(((monthPayments - lastMonthPayments) / lastMonthPayments) * 100)
    : monthPayments > 0 ? 100 : 0;

  const conversionRate = totalPayments > 0
    ? Math.round((paidPayments / totalPayments) * 100)
    : 0;

  return {
    totalRevenue: totalRev,
    monthRevenue: monthRev,
    revenueChange,
    paymentCount: totalPayments,
    monthPayments,
    paymentChange,
    conversionRate,
  };
}

/**
 * Get recent transactions for the overview page.
 */
export async function getRecentTransactions(userId: string, limit = 5) {
  return db.payment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Get paginated, filtered payment list.
 */
export async function getPayments(
  userId: string,
  opts: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }
) {
  const where: Record<string, unknown> = { userId };

  if (opts.status && opts.status !== "all") {
    where.status = opts.status;
  }

  if (opts.search) {
    where.OR = [
      { trackId: { contains: opts.search, mode: "insensitive" } },
      { description: { contains: opts.search, mode: "insensitive" } },
      { txId: { contains: opts.search, mode: "insensitive" } },
      { payAddress: { contains: opts.search, mode: "insensitive" } },
    ];
  }

  const limit = opts.limit ?? 20;
  const page = opts.page ?? 1;
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    db.payment.count({ where }),
  ]);

  return {
    payments,
    total,
    page,
    pages: Math.ceil(total / limit),
    limit,
  };
}

/**
 * Get status counts for filter badges.
 */
export async function getStatusCounts(userId: string) {
  const [all, pending, confirming, paid, expired, failed] = await Promise.all([
    db.payment.count({ where: { userId } }),
    db.payment.count({ where: { userId, status: "pending" } }),
    db.payment.count({ where: { userId, status: "confirming" } }),
    db.payment.count({ where: { userId, status: "paid" } }),
    db.payment.count({ where: { userId, status: "expired" } }),
    db.payment.count({ where: { userId, status: "failed" } }),
  ]);

  return { all, pending, confirming, paid, expired, failed };
}

/**
 * Get analytics data for charts.
 */
export async function getAnalyticsData(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const payments = await db.payment.findMany({
    where: {
      userId,
      createdAt: { gte: startDate, lte: endDate },
    },
    select: {
      amount: true,
      status: true,
      payCurrency: true,
      createdAt: true,
    },
  });

  // Bucket by day
  const volumeByDay = new Map<string, { volume: number; count: number }>();
  const cryptoBreakdown = new Map<string, { count: number; volume: number }>();
  const statusBreakdown = new Map<string, number>();

  for (const p of payments) {
    // Daily volume (only count paid)
    const day = p.createdAt.toISOString().split("T")[0];
    const existing = volumeByDay.get(day) || { volume: 0, count: 0 };
    if (p.status === "paid") {
      existing.volume += p.amount;
    }
    existing.count++;
    volumeByDay.set(day, existing);

    // Crypto breakdown
    if (p.payCurrency) {
      const crypto = cryptoBreakdown.get(p.payCurrency) || { count: 0, volume: 0 };
      crypto.count++;
      if (p.status === "paid") crypto.volume += p.amount;
      cryptoBreakdown.set(p.payCurrency, crypto);
    }

    // Status breakdown
    statusBreakdown.set(p.status, (statusBreakdown.get(p.status) || 0) + 1);
  }

  return {
    volumeByDay: Array.from(volumeByDay.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    cryptoBreakdown: Array.from(cryptoBreakdown.entries())
      .map(([crypto, data]) => ({ crypto, ...data }))
      .sort((a, b) => b.count - a.count),
    statusBreakdown: Array.from(statusBreakdown.entries())
      .map(([status, count]) => ({ status, count })),
  };
}

/**
 * Get conversion funnel: total created → confirming/paid → paid.
 */
export async function getConversionFunnel(
  userId: string,
  startDate?: Date,
  endDate?: Date
) {
  const where: Record<string, unknown> = { userId };
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    };
  }

  const [created, confirming, paid] = await Promise.all([
    db.payment.count({ where }),
    db.payment.count({
      where: { ...where, status: { in: ["confirming", "paid"] } },
    }),
    db.payment.count({ where: { ...where, status: "paid" } }),
  ]);

  return { created, confirming, paid };
}

/**
 * Get geographic distribution by senderAddress country.
 * Since we don't store country data directly, we approximate by
 * grouping payments by their network/chain as a proxy. In a production
 * setup this would use IP geolocation data stored on payment creation.
 *
 * For now, we group by chain to provide a useful breakdown.
 * Returns top N entries sorted by volume.
 */
export async function getGeoDistribution(
  userId: string,
  limit = 10,
  startDate?: Date,
  endDate?: Date
) {
  const where: Record<string, unknown> = {
    userId,
    status: "paid",
    chain: { not: null },
  };
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    };
  }

  const payments = await db.payment.findMany({
    where,
    select: { chain: true, amount: true },
  });

  const byChain = new Map<string, { count: number; volume: number }>();
  for (const p of payments) {
    const key = p.chain ?? "unknown";
    const existing = byChain.get(key) || { count: 0, volume: 0 };
    existing.count++;
    existing.volume += p.amount;
    byChain.set(key, existing);
  }

  return Array.from(byChain.entries())
    .map(([chain, data]) => ({ chain, ...data }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit);
}

/**
 * Get revenue grouped by day of week (0=Sunday .. 6=Saturday).
 */
export async function getRevenueByWeekday(
  userId: string,
  startDate?: Date,
  endDate?: Date
) {
  const where: Record<string, unknown> = { userId, status: "paid" };
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    };
  }

  const payments = await db.payment.findMany({
    where,
    select: { amount: true, paidAt: true, createdAt: true },
  });

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekdays = DAYS.map((label) => ({ label, revenue: 0, count: 0 }));

  for (const p of payments) {
    const date = p.paidAt ?? p.createdAt;
    const day = date.getDay();
    weekdays[day].revenue += p.amount;
    weekdays[day].count++;
  }

  // Reorder to start from Monday
  return [...weekdays.slice(1), weekdays[0]];
}

/**
 * Get average time from payment creation to paid (in minutes).
 */
export async function getAveragePaymentTime(
  userId: string,
  startDate?: Date,
  endDate?: Date
) {
  const where: Record<string, unknown> = {
    userId,
    status: "paid",
    paidAt: { not: null },
  };
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    };
  }

  const payments = await db.payment.findMany({
    where,
    select: { createdAt: true, paidAt: true },
  });

  if (payments.length === 0) return { avgMinutes: 0, count: 0 };

  let totalMs = 0;
  for (const p of payments) {
    if (p.paidAt) {
      totalMs += p.paidAt.getTime() - p.createdAt.getTime();
    }
  }

  const avgMs = totalMs / payments.length;
  return {
    avgMinutes: Math.round(avgMs / 60_000),
    count: payments.length,
  };
}

/**
 * Get daily payment counts over time (for click/creation tracking chart).
 */
export async function getDailyPaymentCounts(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const payments = await db.payment.findMany({
    where: {
      userId,
      createdAt: { gte: startDate, lte: endDate },
    },
    select: { createdAt: true, status: true },
  });

  const byDay = new Map<string, { created: number; paid: number }>();

  for (const p of payments) {
    const day = p.createdAt.toISOString().split("T")[0];
    const existing = byDay.get(day) || { created: 0, paid: 0 };
    existing.created++;
    if (p.status === "paid") existing.paid++;
    byDay.set(day, existing);
  }

  return Array.from(byDay.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get wallet balances — aggregates paid amounts by currency.
 * In production this would query actual on-chain balances.
 */
export async function getWalletSummary(userId: string) {
  const payments = await db.payment.findMany({
    where: { userId, status: "paid", payCurrency: { not: null } },
    select: { payCurrency: true, payAmount: true, amount: true },
  });

  const holdings = new Map<string, { amount: number; usdValue: number }>();
  let totalUsd = 0;

  for (const p of payments) {
    const currency = p.payCurrency ?? "unknown";
    const existing = holdings.get(currency) || { amount: 0, usdValue: 0 };
    existing.amount += p.payAmount ?? 0;
    existing.usdValue += p.amount;
    holdings.set(currency, existing);
    totalUsd += p.amount;
  }

  const topHoldings = Array.from(holdings.entries())
    .map(([currency, data]) => ({ currency, ...data }))
    .sort((a, b) => b.usdValue - a.usdValue)
    .slice(0, 5);

  return { totalUsd, holdings: topHoldings };
}
