import crypto from "node:crypto";
import { db } from "@/lib/db";
import { getChainEntry } from "@/lib/chains/registry";
import { creditBalance } from "@/lib/wallet/wallet-service";
import { trackEvent } from "@/lib/analytics/tracker";

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
        derivationIndex,
        expiresAt,
        platformFeePercent: feePercent,
        merchantWalletAddress,
        forwardingStatus: merchantWalletAddress ? "none" : "skipped",
      },
    });

    await tx.walletAddress.update({
      where: { id: walletAddress.id },
      data: { paymentId: p.id },
    });

    return { payment: p, address: addr };
  });

  return {
    trackId: payment.trackId,
    payAddress: address,
    chain: entry.chain,
    payCurrency: entry.symbol,
    network: entry.network,
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
  if (payment.status === "paid" || payment.status === "expired" || payment.status === "failed") {
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
    // Fully confirmed — calculate platform fee
    const feePercent = payment.platformFeePercent ?? 0.4;
    const feeAmount = check.amount * (feePercent / 100);
    const netAmount = check.amount - feeAmount;

    // Determine forwarding status
    const forwardingStatus = payment.merchantWalletAddress ? "pending" : "skipped";

    await db.payment.update({
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

    // Credit wallet balance (net amount only) + track event
    try {
      if (payment.payCurrency && payment.chain) {
        await creditBalance(
          payment.userId,
          payment.payCurrency,
          payment.chain,
          netAmount,
        );
        await db.walletTransaction.create({
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
        await db.feeLog.create({
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
        await db.platformBalance.upsert({
          where: { currency_chain: { currency: payment.payCurrency, chain: payment.chain } },
          create: { currency: payment.payCurrency, chain: payment.chain, amount: feeAmount },
          update: { amount: { increment: feeAmount } },
        });
      }
    } catch (err) {
      console.error(`[wallet] Failed to credit balance for ${paymentId}:`, err);
    }

    trackEvent({
      userId: payment.userId,
      type: "payment_paid",
      paymentId,
    });

    // Dispatch webhook to merchant
    await dispatchWebhook(paymentId);
    return true;
  } else {
    // Confirming
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
      status: { in: ["pending"] },
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

  return expired.length;
}

/**
 * Dispatch a webhook notification to the merchant.
 */
async function dispatchWebhook(paymentId: string): Promise<void> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { user: { select: { webhookUrl: true, webhookSecret: true } } },
  });

  if (!payment?.user.webhookUrl) return;

  const payload = JSON.stringify({
    event: "payment.completed",
    trackId: payment.trackId,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    payCurrency: payment.payCurrency,
    payAmount: payment.payAmount,
    chain: payment.chain,
    network: payment.network,
    txId: payment.txId,
    paidAt: payment.paidAt?.toISOString(),
  });

  // Generate HMAC signature
  const signature = payment.user.webhookSecret
    ? crypto
        .createHmac("sha256", payment.user.webhookSecret)
        .update(payload)
        .digest("hex")
    : undefined;

  const startTime = Date.now();
  let status = 0;
  let success = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(payment.user.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(signature && { "X-VoidPay-Signature": signature }),
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

  // Log webhook delivery
  await db.webhookLog.create({
    data: {
      userId: payment.userId,
      url: payment.user.webhookUrl,
      payload,
      status,
      success,
      duration,
    },
  });
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
