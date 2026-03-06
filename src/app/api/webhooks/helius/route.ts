import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkPaymentStatus } from "@/lib/payment/engine";

const HELIUS_WEBHOOK_SECRET = process.env.HELIUS_WEBHOOK_SECRET || "";

/**
 * Validate Helius webhook signature.
 * Helius sends the raw secret directly in the Authorization header — compare it
 * against the known secret using timingSafeEqual to prevent timing attacks.
 */
function validateHeliusSignature(signature: string | null): boolean {
  if (!signature || !HELIUS_WEBHOOK_SECRET) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(HELIUS_WEBHOOK_SECRET)
    );
  } catch {
    return false;
  }
}

/**
 * Helius Enhanced Transaction Webhook handler.
 * Receives notifications when transactions are sent to our Solana deposit addresses.
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("authorization");

    if (!HELIUS_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Webhook signing not configured" }, { status: 503 });
    }
    if (!validateHeliusSignature(signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const transactions: HeliusEnhancedTransaction[] = JSON.parse(rawBody);

    // Collect all unique recipient addresses from the payload
    const recipientAddresses = new Set<string>();

    for (const tx of transactions) {
      // Native SOL transfers
      if (tx.nativeTransfers) {
        for (const transfer of tx.nativeTransfers) {
          if (transfer.toUserAccount) {
            recipientAddresses.add(transfer.toUserAccount);
          }
        }
      }

      // SPL token transfers
      if (tx.tokenTransfers) {
        for (const transfer of tx.tokenTransfers) {
          if (transfer.toUserAccount) {
            recipientAddresses.add(transfer.toUserAccount);
          }
        }
      }
    }

    // Look up payments for all recipient addresses in one query
    // Solana addresses are base58 and case-sensitive — match exactly
    if (recipientAddresses.size > 0) {
      const payments = await db.payment.findMany({
        where: {
          payAddress: { in: [...recipientAddresses] },
          status: { in: ["pending", "confirming"] },
        },
        select: { id: true },
      });

      for (const payment of payments) {
        await checkPaymentStatus(payment.id);
      }
    }

    return new NextResponse("ok", { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Helius Enhanced Transaction types (subset used for webhook parsing).
 */
interface HeliusNativeTransfer {
  amount: number;
  fromUserAccount: string;
  toUserAccount: string;
}

interface HeliusTokenTransfer {
  fromTokenAccount: string;
  fromUserAccount: string;
  mint: string;
  toTokenAccount: string;
  toUserAccount: string;
  tokenAmount: number;
  tokenStandard: string;
}

interface HeliusEnhancedTransaction {
  signature: string;
  slot: number;
  timestamp: number;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  nativeTransfers?: HeliusNativeTransfer[];
  tokenTransfers?: HeliusTokenTransfer[];
}
