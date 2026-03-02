import { db } from "@/lib/db";
import { getChainEntry } from "@/lib/chains/registry";

// Exponential backoff delays before each retry attempt
const RETRY_DELAYS_MS = [
  2 * 60 * 1000,       // 2 min
  10 * 60 * 1000,      // 10 min
  30 * 60 * 1000,      // 30 min
  2 * 60 * 60 * 1000,  // 2h
  24 * 60 * 60 * 1000, // 24h — last attempt
];
const MAX_RETRIES = RETRY_DELAYS_MS.length;

export async function processForwardingQueue(): Promise<{
  forwarded: number;
  failed: number;
  skipped: number;
}> {
  const now = new Date();

  const payments = await db.payment.findMany({
    where: {
      forwardingStatus: { in: ["pending", "failed"] },
      forwardingRetryCount: { lt: MAX_RETRIES },
      OR: [
        { forwardingNextRetry: null },
        { forwardingNextRetry: { lte: now } },
      ],
    },
    select: {
      id: true,
      userId: true,
      payCurrency: true,
      chain: true,
      netAmount: true,
      merchantWalletAddress: true,
      forwardingRetryCount: true,
      forwardingTxId: true,
    },
  });

  let forwarded = 0, failed = 0, skipped = 0;

  for (const payment of payments) {
    const { merchantWalletAddress, netAmount } = payment;
    if (!merchantWalletAddress || !netAmount) {
      await db.payment.update({
        where: { id: payment.id },
        data: { forwardingStatus: "skipped" },
      });
      skipped++;
      continue;
    }

    // Check user's min forward threshold
    const user = await db.user.findUnique({
      where: { id: payment.userId },
      select: { minForwardAmount: true },
    });
    if (netAmount < (user?.minForwardAmount ?? 0.001)) {
      skipped++;
      continue;
    }

    // Pass with narrowed (non-null) types
    const paymentToForward = { ...payment, merchantWalletAddress, netAmount };

    try {
      await forwardPayment(paymentToForward);
      forwarded++;
    } catch (err) {
      await handleForwardingFailure(payment, err);
      failed++;
    }
  }

  return { forwarded, failed, skipped };
}

async function forwardPayment(payment: {
  id: string;
  payCurrency: string | null;
  chain: string | null;
  netAmount: number;
  merchantWalletAddress: string;
  forwardingTxId: string | null;
}): Promise<void> {
  if (!payment.chain || !payment.payCurrency) {
    throw new Error("Missing chain or currency on payment");
  }

  // Idempotency guard — if tx was already sent but DB update failed
  if (payment.forwardingTxId) {
    await db.payment.update({
      where: { id: payment.id },
      data: { forwardingStatus: "completed" },
    });
    return;
  }

  // Lock the row to prevent concurrent forwards
  await db.payment.update({
    where: { id: payment.id },
    data: { forwardingStatus: "processing" },
  });

  const entry = getChainEntry(payment.payCurrency);
  if (!entry?.provider?.send) {
    throw new Error(`Provider ${payment.payCurrency} does not support send()`);
  }

  // Estimate network fee and subtract from netAmount
  let sendAmount = payment.netAmount;
  if (entry.provider.estimateFee) {
    try {
      const networkFee = await entry.provider.estimateFee(
        payment.merchantWalletAddress,
        sendAmount
      );
      sendAmount = Math.max(0, sendAmount - networkFee);
    } catch {
      // Non-fatal — proceed without deduction, provider will handle internally
    }
  }

  if (sendAmount <= 0) {
    throw new Error("Amount after network fee is zero or negative");
  }

  const result = await entry.provider.send({
    fromIndex: 0,
    toAddress: payment.merchantWalletAddress,
    amount: sendAmount,
  });

  await db.payment.update({
    where: { id: payment.id },
    data: {
      forwardingStatus: "completed",
      forwardingTxId: result.txHash,
      forwardedAt: new Date(),
      forwardingLastError: null,
    },
  });
}

async function handleForwardingFailure(
  payment: { id: string; forwardingRetryCount: number },
  err: unknown
): Promise<void> {
  const retryCount = payment.forwardingRetryCount + 1;
  const isExhausted = retryCount >= MAX_RETRIES;
  const nextDelayMs = RETRY_DELAYS_MS[retryCount - 1] ?? null;
  const forwardingNextRetry = nextDelayMs && !isExhausted
    ? new Date(Date.now() + nextDelayMs)
    : null;

  await db.payment.update({
    where: { id: payment.id },
    data: {
      forwardingStatus: "failed",
      forwardingRetryCount: retryCount,
      forwardingNextRetry,
      forwardingLastError: err instanceof Error ? err.message : String(err),
    },
  });

  console.error(
    `[forwarder] Payment ${payment.id} failed (attempt ${retryCount}/${MAX_RETRIES}):`,
    err
  );
}
