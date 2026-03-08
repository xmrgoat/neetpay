// @ts-nocheck
// TODO: Migrate to new Prisma schema (Merchant/Invoice instead of User/Payment)
import { db } from "@/lib/db";

/**
 * Get overview stats for the dashboard home page.
 */
export async function getOverviewStats(userId: string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Fetch all user payments once and compute stats in JS
  // (Prisma driver adapters don't support aggregate/groupBy)
  const [allPayments, totalPayments, pendingPayments] = await Promise.all([
    db.payment.findMany({
      where: { userId },
      select: { amount: true, status: true, payCurrency: true, createdAt: true },
    }),
    db.payment.count({ where: { userId } }),
    db.payment.count({ where: { userId, status: { in: ["pending", "confirming"] } } }),
  ]);

  const paid = allPayments.filter((p) => p.status === "paid");
  const pending = allPayments.filter((p) => p.status === "pending" || p.status === "confirming");

  const totalRev = paid.reduce((s, p) => s + p.amount, 0);
  const todayRev = paid.filter((p) => p.createdAt >= startOfToday).reduce((s, p) => s + p.amount, 0);
  const weekRev = paid.filter((p) => p.createdAt >= startOfWeek).reduce((s, p) => s + p.amount, 0);
  const monthRev = paid.filter((p) => p.createdAt >= startOfMonth).reduce((s, p) => s + p.amount, 0);
  const lastMonthRev = paid.filter((p) => p.createdAt >= startOfLastMonth && p.createdAt < startOfMonth).reduce((s, p) => s + p.amount, 0);

  const monthPayments = allPayments.filter((p) => p.createdAt >= startOfMonth).length;
  const lastMonthPayments = allPayments.filter((p) => p.createdAt >= startOfLastMonth && p.createdAt < startOfMonth).length;
  const paidPayments = paid.length;

  const revenueChange = lastMonthRev > 0
    ? Math.round(((monthRev - lastMonthRev) / lastMonthRev) * 100)
    : monthRev > 0 ? 100 : 0;

  const paymentChange = lastMonthPayments > 0
    ? Math.round(((monthPayments - lastMonthPayments) / lastMonthPayments) * 100)
    : monthPayments > 0 ? 100 : 0;

  const conversionRate = totalPayments > 0
    ? Math.round((paidPayments / totalPayments) * 1000) / 10
    : 0;

  const avgPayment = paidPayments > 0 ? Math.round(totalRev / paidPayments) : 0;

  const monthPaid = monthPayments > 0 ? monthRev / monthPayments : 0;
  const lastMonthPaid = lastMonthPayments > 0 ? lastMonthRev / lastMonthPayments : 0;
  const avgChange = lastMonthPaid > 0
    ? Math.round(((monthPaid - lastMonthPaid) / lastMonthPaid) * 100)
    : monthPaid > 0 ? 100 : 0;

  // Payment method breakdown
  const currencyMap = new Map<string, number>();
  for (const p of paid) {
    if (p.payCurrency) {
      currencyMap.set(p.payCurrency, (currencyMap.get(p.payCurrency) || 0) + p.amount);
    }
  }
  const paymentMethods = totalRev > 0
    ? Array.from(currencyMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([currency, amount]) => ({
          currency,
          percentage: Math.round((amount / totalRev) * 1000) / 10,
        }))
    : [];

  const pendingPayout = pending.reduce((s, p) => s + p.amount, 0);

  return {
    totalRevenue: totalRev,
    todayRevenue: todayRev,
    weekRevenue: weekRev,
    monthRevenue: monthRev,
    revenueChange,
    paymentCount: totalPayments,
    monthPayments,
    paymentChange,
    conversionRate,
    avgPayment,
    avgChange,
    pendingCount: pendingPayments,
    pendingPayout,
    paymentMethods,
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
 * Get success / failure rate KPIs for analytics.
 */
export async function getSuccessMetrics(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const where = { userId, createdAt: { gte: startDate, lte: endDate } };

  const [total, paid, failed, expired, refunded, underpaid] = await Promise.all([
    db.payment.count({ where }),
    db.payment.count({ where: { ...where, status: "paid" } }),
    db.payment.count({ where: { ...where, status: "failed" } }),
    db.payment.count({ where: { ...where, status: "expired" } }),
    db.payment.count({ where: { ...where, status: "refunded" } }),
    db.payment.count({ where: { ...where, status: "underpaid" } }),
  ]);

  const successRate = total > 0 ? Math.round((paid / total) * 1000) / 10 : 0;
  const failureRate = total > 0 ? Math.round((failed / total) * 1000) / 10 : 0;
  const expiredRate = total > 0 ? Math.round((expired / total) * 1000) / 10 : 0;
  const refundRate = total > 0 ? Math.round((refunded / total) * 1000) / 10 : 0;
  const underpaidRate = total > 0 ? Math.round((underpaid / total) * 1000) / 10 : 0;

  return {
    total, paid, failed, expired, refunded, underpaid,
    successRate, failureRate, expiredRate, refundRate, underpaidRate,
  };
}

/**
 * Get payment volume comparison: current period vs previous period of same length.
 */
export async function getPeriodComparison(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const durationMs = endDate.getTime() - startDate.getTime();
  const prevStart = new Date(startDate.getTime() - durationMs);
  const prevEnd = new Date(startDate);

  // Use findMany instead of aggregate (driver adapter compat)
  const [currentPayments, previousPayments] = await Promise.all([
    db.payment.findMany({
      where: { userId, status: "paid", createdAt: { gte: startDate, lte: endDate } },
      select: { amount: true },
    }),
    db.payment.findMany({
      where: { userId, status: "paid", createdAt: { gte: prevStart, lte: prevEnd } },
      select: { amount: true },
    }),
  ]);

  const curVol = currentPayments.reduce((s, p) => s + p.amount, 0);
  const prevVol = previousPayments.reduce((s, p) => s + p.amount, 0);
  const currentCount = currentPayments.length;
  const previousCount = previousPayments.length;
  const volumeChange = prevVol > 0 ? Math.round(((curVol - prevVol) / prevVol) * 1000) / 10 : (curVol > 0 ? 100 : 0);
  const countChange = previousCount > 0 ? Math.round(((currentCount - previousCount) / previousCount) * 1000) / 10 : (currentCount > 0 ? 100 : 0);

  return {
    currentVolume: curVol,
    previousVolume: prevVol,
    volumeChange,
    currentCount,
    previousCount,
    countChange,
  };
}

/**
 * Get payment amount distribution (histogram buckets).
 */
export async function getAmountDistribution(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const payments = await db.payment.findMany({
    where: { userId, status: "paid", createdAt: { gte: startDate, lte: endDate } },
    select: { amount: true },
  });

  const buckets = [
    { label: "<$10", min: 0, max: 10, count: 0 },
    { label: "$10–50", min: 10, max: 50, count: 0 },
    { label: "$50–100", min: 50, max: 100, count: 0 },
    { label: "$100–500", min: 100, max: 500, count: 0 },
    { label: "$500–1K", min: 500, max: 1000, count: 0 },
    { label: "$1K–5K", min: 1000, max: 5000, count: 0 },
    { label: "$5K+", min: 5000, max: Infinity, count: 0 },
  ];

  for (const p of payments) {
    const bucket = buckets.find((b) => p.amount >= b.min && p.amount < b.max);
    if (bucket) bucket.count++;
  }

  return buckets.map(({ label, count }) => ({ label, count }));
}

/**
 * Get top currencies ranked by volume with percentage.
 */
export async function getTopCurrencies(
  userId: string,
  startDate: Date,
  endDate: Date,
  limit = 8
) {
  const payments = await db.payment.findMany({
    where: { userId, status: "paid", payCurrency: { not: null }, createdAt: { gte: startDate, lte: endDate } },
    select: { payCurrency: true, amount: true },
  });

  const byKey = new Map<string, { volume: number; count: number }>();
  let totalVolume = 0;

  for (const p of payments) {
    const key = p.payCurrency ?? "unknown";
    const existing = byKey.get(key) || { volume: 0, count: 0 };
    existing.volume += p.amount;
    existing.count++;
    byKey.set(key, existing);
    totalVolume += p.amount;
  }

  return Array.from(byKey.entries())
    .map(([currency, data]) => ({
      currency,
      ...data,
      percentage: totalVolume > 0 ? Math.round((data.volume / totalVolume) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit);
}

/**
 * Get hourly activity heatmap (hour of day vs day of week).
 */
export async function getHourlyHeatmap(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const payments = await db.payment.findMany({
    where: { userId, createdAt: { gte: startDate, lte: endDate } },
    select: { createdAt: true },
  });

  // 7 days x 24 hours grid
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

  for (const p of payments) {
    const day = p.createdAt.getDay(); // 0=Sun
    const hour = p.createdAt.getHours();
    grid[day][hour]++;
  }

  return grid;
}

/**
 * Get 10-point sparkline data for dashboard overview KPI cards.
 * Returns daily payment counts, conversion rates, avg payment values,
 * and active link counts over the last 10 days.
 */
export async function getKpiSparklines(userId: string) {
  const days = 10;
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - days);

  const payments = await db.payment.findMany({
    where: { userId, createdAt: { gte: start } },
    select: { createdAt: true, status: true, amount: true },
  });

  const pending = await db.payment.findMany({
    where: { userId, status: { in: ["pending", "confirming"] } },
    select: { createdAt: true },
  });

  // Bucket into days
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toISOString().split("T")[0];
  });

  const paymentCounts: number[] = [];
  const conversionRates: number[] = [];
  const avgPayments: number[] = [];
  const activeLinkCounts: number[] = [];

  for (const day of buckets) {
    const dayPayments = payments.filter(
      (p) => p.createdAt.toISOString().split("T")[0] === day
    );
    const total = dayPayments.length;
    const paid = dayPayments.filter((p) => p.status === "paid");

    paymentCounts.push(total);
    conversionRates.push(
      total > 0 ? Math.round((paid.length / total) * 100) : 0
    );
    avgPayments.push(
      paid.length > 0
        ? Math.round(paid.reduce((s, p) => s + p.amount, 0) / paid.length)
        : 0
    );

    const dayDate = new Date(day);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const activeOnDay = pending.filter(
      (p) => p.createdAt <= nextDay
    ).length;
    activeLinkCounts.push(activeOnDay);
  }

  return { paymentCounts, conversionRates, avgPayments, activeLinkCounts };
}

/**
 * Get fees collected by this user's payments (platform fee audit).
 */
export async function getFeesCollected(
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

  const logs = await db.feeLog.findMany({
    where,
    select: {
      currency: true,
      feeAmount: true,
      netAmount: true,
      receivedAmount: true,
      createdAt: true,
    },
  });

  const byCurrency = new Map<string, { fees: number; net: number; gross: number; count: number }>();
  for (const log of logs) {
    const existing = byCurrency.get(log.currency) || { fees: 0, net: 0, gross: 0, count: 0 };
    existing.fees += log.feeAmount;
    existing.net += log.netAmount;
    existing.gross += log.receivedAmount;
    existing.count++;
    byCurrency.set(log.currency, existing);
  }

  return Array.from(byCurrency.entries()).map(([currency, data]) => ({
    currency,
    ...data,
  }));
}

/**
 * Get forwarding status summary for settled payments.
 */
export async function getForwardingStatus(userId: string) {
  const payments = await db.payment.findMany({
    where: {
      userId,
      status: "paid",
      forwardingStatus: { not: "none" },
    },
    select: {
      id: true,
      trackId: true,
      payCurrency: true,
      netAmount: true,
      forwardingStatus: true,
      forwardingTxId: true,
      forwardedAt: true,
      forwardingRetryCount: true,
      forwardingLastError: true,
      paidAt: true,
    },
    orderBy: { paidAt: "desc" },
    take: 20,
  });

  const statusCounts = payments.reduce(
    (acc, p) => {
      acc[p.forwardingStatus] = (acc[p.forwardingStatus] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return { payments, statusCounts };
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
