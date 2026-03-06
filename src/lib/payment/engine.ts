import crypto from "node:crypto";
import { db } from "@/lib/db";
import { getChainEntry } from "@/lib/chains/registry";
import { trackEvent } from "@/lib/analytics/tracker";
import { decryptField } from "@/lib/crypto/field-cipher";

/**
 * Returns true if the URL points to a private/internal address that should
 * never receive outbound webhook requests (SSRF protection).
 */
function isInternalUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname;
    // Block localhost
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true;
    // Block private ranges
    if (hostname.startsWith("10.")) return true;
    if (hostname.startsWith("192.168.")) return true;
    if (hostname.match(/^172\.(1[6-9]|2\d|3[01])\./)) return true;
    // Block link-local and AWS metadata endpoint
    if (hostname.startsWith("169.254.")) return true;
    // Block unspecified address
    if (hostname === "0.0.0.0") return true;
    return false;
  } catch {
    return true; // Invalid URL — block
  }
}

/**
 * Create a new payment with a unique deposit address.
 */
export async function createPayment(params: {
  userId: string;
  amount: number;
  currency: string;
  payCurrencyKey: string;
  description?: string;
  lifetimeMinutes?: number;
  callbackUrl?: string;
  returnUrl?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}) {
  const entry = getChainEntry(params.payCurrencyKey);
  if (!entry) {
    throw new Error(`Unsupported currency: ${params.payCurrencyKey}`);
  }

  const trackId = generateTrackId();
  const lifetimeMs = (params.lifetimeMinutes || 30) * 60 * 1000;
  const expiresAt = new Date(Date.now() + lifetimeMs);

  // Snapshot merchant settlement config at creation time
  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: {
      xmrSettlementAddress: true,
      autoForwardEnabled: true,
      platformFeePercent: true,
    },
  });

  // Only XMR supports auto-forwarding for now
  const isXmr = entry.symbol === "XMR";
  const merchantWalletAddress =
    isXmr && user?.autoForwardEnabled ? (user.xmrSettlementAddress ?? null) : null;
  const feePercent = user?.platformFeePercent ?? 0.4;

  // Calculate expected crypto amount from fiat price at creation time
  let expectedPayAmount: number | null = null;
  try {
    const priceCache = await db.priceCache.findUnique({
      where: { symbol: entry.symbol },
    });
    if (priceCache?.usdPrice && priceCache.usdPrice > 0) {
      // Convert fiat amount (assumed USD) to crypto units
      expectedPayAmount = params.amount / priceCache.usdPrice;
    }
  } catch (err) {
    console.error(`[payment] Failed to lookup price for ${entry.symbol}:`, err);
    // Non-fatal — payment still created, underpaid detection just won't work
  }

  // Atomic: allocate derivation index + generate address + create records
  const { payment, address } = await db.$transaction(async (tx) => {
    const lastAddress = await tx.walletAddress.findFirst({
      where: { chain: entry.chain },
      orderBy: { derivationIndex: "desc" },
      select: { derivationIndex: true },
    });
    const derivationIndex = (lastAddress?.derivationIndex ?? -1) + 1;

    const { address: addr } = await entry.provider.generateAddress(derivationIndex);

    const walletAddress = await tx.walletAddress.create({
      data: {
        chain: entry.chain,
        address: addr,
        derivationIndex,
      },
    });

    const p = await tx.payment.create({
      data: {
        userId: params.userId,
        trackId,
        amount: params.amount,
        currency: params.currency,
        status: "pending",
        description: params.description,
        chain: entry.chain,
        payCurrency: entry.symbol,
        payAddress: addr,
        network: entry.network,
        tokenContract: entry.tokenContract,
        requiredConfs: entry.provider.getRequiredConfirmations(),
        expectedPayAmount,
        derivationIndex,
        expiresAt,
        platformFeePercent: feePercent,
        merchantWalletAddress,
        forwardingStatus: merchantWalletAddress ? "none" : "skipped",
        callbackUrl: params.callbackUrl,
        returnUrl: params.returnUrl,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
        idempotencyKey: params.idempotencyKey,
      },
    });

    await tx.walletAddress.update({
      where: { id: walletAddress.id },
      data: { paymentId: p.id },
    });

    return { payment: p, address: addr };
  });

  // Dispatch payment.created webhook (fire-and-forget)
  dispatchWebhook(payment.id).catch(() => {});

  return {
    trackId: payment.trackId,
    payAddress: address,
    chain: entry.chain,
    payCurrency: entry.symbol,
    network: entry.network,
    expectedPayAmount,
    requiredConfirmations: entry.provider.getRequiredConfirmations(),
    expiresAt,
    explorerUrl: entry.provider.getExplorerUrl(""),
  };
}

/**
 * Check a pending payment for incoming transactions.
 * Returns true if the payment status was updated.
 */
export async function checkPaymentStatus(paymentId: string): Promise<boolean> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment || !payment.payAddress || !payment.chain) return false;
  if (
    payment.status === "paid" ||
    payment.status === "expired" ||
    payment.status === "failed" ||
    payment.status === "underpaid"
  ) {
    return false;
  }

  // Check expiration
  if (payment.expiresAt && new Date() > payment.expiresAt) {
    await db.payment.update({
      where: { id: paymentId },
      data: { status: "expired" },
    });
    // Release wallet address
    await db.walletAddress.updateMany({
      where: { paymentId },
      data: { paymentId: null },
    });
    // Notify merchant of expiration
    await dispatchWebhook(paymentId);
    return true;
  }

  const currencyKey = buildCurrencyKey(payment);
  const entry = getChainEntry(currencyKey);
  if (!entry) return false;

  const check = await entry.provider.checkPayment(
    payment.payAddress,
    payment.payAmount ?? undefined,
    payment.tokenContract ?? undefined
  );

  if (!check) return false;

  // Transaction detected
  if (check.confirmations >= entry.provider.getRequiredConfirmations()) {
    // Underpaid detection — compare received amount against expected
    if (payment.expectedPayAmount && payment.expectedPayAmount > 0) {
      const expectedAmount = payment.expectedPayAmount;
      const receivedAmount = check.amount;

      // Allow 2% tolerance for network fee deductions / rounding
      const tolerance = expectedAmount * 0.02;

      if (receivedAmount < expectedAmount - tolerance) {
        // Underpaid — mark as underpaid, don't credit wallet balance
        await db.payment.update({
          where: { id: paymentId },
          data: {
            status: "underpaid",
            txId: check.txHash || payment.txId,
            senderAddress: check.from !== "unknown" ? check.from : payment.senderAddress,
            payAmount: receivedAmount,
            confirmations: check.confirmations,
          },
        });

        trackEvent({
          userId: payment.userId,
          type: "payment_paid",
          paymentId,
        });

        // Dispatch webhook so merchant is notified of underpayment
        await dispatchWebhook(paymentId);
        return true;
      }
    }

    // Fully confirmed — calculate platform fee
    const feePercent = payment.platformFeePercent ?? 0.4;
    const feeAmount = check.amount * (feePercent / 100);
    const netAmount = check.amount - feeAmount;

    // Determine forwarding status
    const forwardingStatus = payment.merchantWalletAddress ? "pending" : "skipped";

    // Atomic: credit balance + record fee + mark paid in a single transaction.
    // If any step fails, the payment stays in its current state and will be
    // retried on the next polling cycle — no funds are lost.
    await db.$transaction(async (tx) => {
      // Credit wallet balance first (net amount only)
      if (payment.payCurrency && payment.chain) {
        await tx.walletBalance.upsert({
          where: {
            userId_currency_chain: {
              userId: payment.userId,
              currency: payment.payCurrency,
              chain: payment.chain,
            },
          },
          create: {
            userId: payment.userId,
            currency: payment.payCurrency,
            chain: payment.chain,
            amount: netAmount,
          },
          update: { amount: { increment: netAmount } },
        });

        await tx.walletTransaction.create({
          data: {
            userId: payment.userId,
            type: "payment_received",
            currency: payment.payCurrency,
            chain: payment.chain,
            amount: netAmount,
            fee: feeAmount,
            txHash: check.txHash || undefined,
            paymentId: payment.id,
            status: "confirmed",
          },
        });

        // Persist fee audit log
        await tx.feeLog.create({
          data: {
            userId: payment.userId,
            paymentId: payment.id,
            currency: payment.payCurrency,
            chain: payment.chain,
            receivedAmount: check.amount,
            feeAmount,
            feePercent,
            netAmount,
            txId: check.txHash || undefined,
          },
        });

        // Increment platform balance
        await tx.platformBalance.upsert({
          where: { currency_chain: { currency: payment.payCurrency, chain: payment.chain } },
          create: { currency: payment.payCurrency, chain: payment.chain, amount: feeAmount },
          update: { amount: { increment: feeAmount } },
        });
      }

      // Mark paid LAST — only after balance + fees are committed
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: "paid",
          txId: check.txHash || payment.txId,
          senderAddress: check.from !== "unknown" ? check.from : payment.senderAddress,
          payAmount: check.amount,
          confirmations: check.confirmations,
          paidAt: new Date(),
          platformFeeAmount: feeAmount,
          netAmount,
          forwardingStatus,
        },
      });
    });

    trackEvent({
      userId: payment.userId,
      type: "payment_paid",
      paymentId,
    });

    // Dispatch webhook to merchant
    await dispatchWebhook(paymentId);
    return true;
  } else {
    // Confirming — only dispatch webhook on first detection (pending → confirming)
    const wasNewlyDetected = payment.status === "pending";

    await db.payment.update({
      where: { id: paymentId },
      data: {
        status: "confirming",
        txId: check.txHash || payment.txId,
        senderAddress: check.from !== "unknown" ? check.from : payment.senderAddress,
        payAmount: check.amount,
        confirmations: check.confirmations,
      },
    });

    if (wasNewlyDetected) {
      await dispatchWebhook(paymentId);
    }
    return true;
  }
}

/**
 * Poll all active payments that need checking.
 * Used by the cron job for chains without webhooks (BTC, TRON, XMR).
 */
export async function pollActivePayments(): Promise<{
  checked: number;
  updated: number;
}> {
  // Get all pending/confirming payments for polling-based chains
  const payments = await db.payment.findMany({
    where: {
      status: { in: ["pending", "confirming"] },
      chain: { in: ["bitcoin", "tron", "monero", "litecoin", "dogecoin"] },
    },
    select: { id: true },
  });

  let updated = 0;
  for (const payment of payments) {
    const wasUpdated = await checkPaymentStatus(payment.id);
    if (wasUpdated) updated++;
  }

  return { checked: payments.length, updated };
}

/**
 * Expire all payments past their expiration time.
 */
export async function expirePayments(): Promise<number> {
  const now = new Date();

  const expired = await db.payment.findMany({
    where: {
      status: { in: ["pending", "confirming"] },
      expiresAt: { lte: now },
    },
    select: { id: true },
  });

  if (expired.length === 0) return 0;

  await db.payment.updateMany({
    where: {
      id: { in: expired.map((p) => p.id) },
    },
    data: { status: "expired" },
  });

  // Release wallet addresses
  await db.walletAddress.updateMany({
    where: {
      paymentId: { in: expired.map((p) => p.id) },
    },
    data: { paymentId: null },
  });

  // Dispatch expiration webhooks (fire-and-forget)
  for (const p of expired) {
    dispatchWebhook(p.id).catch(() => {});
  }

  return expired.length;
}

/**
 * Webhook retry schedule: delays in milliseconds.
 * 30s, 2min, 10min, 1h, 6h — 5 max retries.
 */
const WEBHOOK_RETRY_DELAYS_MS = [
  30_000,        // 30 seconds
  2 * 60_000,    // 2 minutes
  10 * 60_000,   // 10 minutes
  60 * 60_000,   // 1 hour
  6 * 60 * 60_000, // 6 hours
] as const;

const MAX_WEBHOOK_RETRIES = WEBHOOK_RETRY_DELAYS_MS.length;

/**
 * Dispatch a webhook notification to the merchant.
 * On failure, schedules the first retry via nextRetryAt.
 */
async function dispatchWebhook(paymentId: string, retryCount = 0): Promise<void> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { user: { select: { webhookUrl: true, webhookSecret: true } } },
  });

  const webhookUrl = payment?.callbackUrl || payment?.user.webhookUrl;
  if (!payment || !webhookUrl) return;
  if (isInternalUrl(webhookUrl)) return;

  // Determine event name from payment status
  const statusToEvent: Record<string, string> = {
    pending: "payment.created",
    paid: "payment.paid",
    underpaid: "payment.underpaid",
    expired: "payment.expired",
    failed: "payment.failed",
    confirming: "payment.confirming",
  };
  const eventName = statusToEvent[payment.status] || `payment.${payment.status}`;

  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = Math.floor(Date.now() / 1000);

  const payload = JSON.stringify({
    event: eventName,
    trackId: payment.trackId,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    payCurrency: payment.payCurrency,
    payAmount: payment.payAmount,
    expectedPayAmount: payment.expectedPayAmount,
    chain: payment.chain,
    network: payment.network,
    txId: payment.txId,
    paidAt: payment.paidAt?.toISOString(),
    metadata: payment.metadata ?? undefined,
    timestamp,
    nonce,
  });

  // Decrypt the stored webhook secret before using it for HMAC signing
  const webhookSecret = payment.user.webhookSecret
    ? decryptField(payment.user.webhookSecret)
    : null;

  // Generate HMAC signature — timestamp prepended to payload for replay protection
  const signature = webhookSecret
    ? crypto
        .createHmac("sha256", webhookSecret)
        .update(`${timestamp}.${payload}`)
        .digest("hex")
    : undefined;

  const startTime = Date.now();
  let status = 0;
  let success = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(signature && { "X-VoidPay-Signature": signature }),
        "X-VoidPay-Timestamp": String(timestamp),
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

  // Calculate next retry time if delivery failed and retries remain
  let nextRetryAt: Date | null = null;
  if (!success && retryCount < MAX_WEBHOOK_RETRIES) {
    const delayMs = WEBHOOK_RETRY_DELAYS_MS[retryCount];
    nextRetryAt = new Date(Date.now() + delayMs);
  }

  // Log webhook delivery with retry metadata
  await db.webhookLog.create({
    data: {
      userId: payment.userId,
      paymentId,
      url: webhookUrl,
      payload,
      status,
      success,
      duration,
      retryCount,
      nextRetryAt,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });
}

/**
 * Retry failed webhooks that are due for re-delivery.
 * Intended to be called from a cron job (e.g. every 30 seconds).
 *
 * Finds the latest failed WebhookLog per paymentId that:
 *   - was not successful
 *   - has a nextRetryAt in the past
 *   - hasn't exceeded MAX_WEBHOOK_RETRIES
 *
 * For each, re-dispatches the webhook with an incremented retryCount.
 */
export async function retryFailedWebhooks(): Promise<{
  retried: number;
  succeeded: number;
}> {
  const now = new Date();

  // Find failed webhook logs that are due for retry
  const dueForRetry = await db.webhookLog.findMany({
    where: {
      success: false,
      nextRetryAt: { lte: now },
      retryCount: { lt: MAX_WEBHOOK_RETRIES },
    },
    orderBy: { createdAt: "desc" },
  });

  // Deduplicate by paymentId — only retry the latest log per payment
  const seenPayments = new Set<string>();
  const uniqueLogs = dueForRetry.filter((log) => {
    if (!log.paymentId) return false;
    if (seenPayments.has(log.paymentId)) return false;
    seenPayments.add(log.paymentId);
    return true;
  });

  let retried = 0;
  let succeeded = 0;

  for (const log of uniqueLogs) {
    if (!log.paymentId) continue;

    // Clear the nextRetryAt on the old log so it isn't picked up again
    await db.webhookLog.update({
      where: { id: log.id },
      data: { nextRetryAt: null },
    });

    const nextRetryCount = log.retryCount + 1;

    // Re-dispatch creates a new WebhookLog entry
    try {
      await dispatchWebhook(log.paymentId, nextRetryCount);

      // Check if the new attempt succeeded
      const latest = await db.webhookLog.findFirst({
        where: { paymentId: log.paymentId },
        orderBy: { createdAt: "desc" },
      });
      if (latest?.success) succeeded++;
    } catch (err) {
      console.error(`[webhook-retry] Failed to retry webhook for payment ${log.paymentId}:`, err);
    }

    retried++;
  }

  return { retried, succeeded };
}

/**
 * Build the currency registry key from a payment record.
 */
function buildCurrencyKey(payment: {
  chain: string | null;
  payCurrency: string | null;
  tokenContract: string | null;
}): string {
  if (!payment.payCurrency) return "";

  // Native coins map directly
  const nativeMap: Record<string, string> = {
    ETH: "ETH",
    BTC: "BTC",
    SOL: "SOL",
    XMR: "XMR",
    TRX: "TRX",
    BNB: "BNB",
    MATIC: "MATIC",
    LTC: "LTC",
    DOGE: "DOGE",
    ARB: "ARB",
    OP: "OP",
    AVAX: "AVAX",
  };

  if (!payment.tokenContract && nativeMap[payment.payCurrency]) {
    return nativeMap[payment.payCurrency];
  }

  // Tokens need chain suffix
  const chainSuffix: Record<string, string> = {
    ethereum: "ERC20",
    polygon: "POLYGON",
    bsc: "BSC",
    solana: "SOL",
    tron: "TRC20",
  };

  const suffix = chainSuffix[payment.chain || ""] || "";
  return `${payment.payCurrency}-${suffix}`;
}

/**
 * Generate a unique track ID for a payment.
 */
function generateTrackId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(6).toString("hex");
  return `vp_${timestamp}_${random}`;
}
