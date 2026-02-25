import crypto from "node:crypto";

const OXAPAY_BASE = "https://api.oxapay.com";

function getMerchantKey() {
  const key = process.env.OXAPAY_MERCHANT_API_KEY;
  if (!key) throw new Error("OXAPAY_MERCHANT_API_KEY is not set");
  return key;
}

export interface CreateInvoiceParams {
  amount: number;
  currency?: string;
  lifeTime?: number;
  callbackUrl?: string;
  returnUrl?: string;
  description?: string;
  orderId?: string;
}

export interface InvoiceResponse {
  result: number;
  message: string;
  trackId?: string;
  payLink?: string;
}

export interface WhiteLabelParams {
  amount: number;
  currency?: string;
  payCurrency: string;
  network?: string;
  lifeTime?: number;
  callbackUrl?: string;
  returnUrl?: string;
  description?: string;
  orderId?: string;
}

export interface WhiteLabelResponse {
  result: number;
  message: string;
  trackId?: string;
  payAddress?: string;
  payAmount?: number;
  payCurrency?: string;
  network?: string;
  expiredAt?: number;
}

export interface PaymentStatusResponse {
  result: number;
  message: string;
  trackId?: string;
  status?: string;
  amount?: number;
  currency?: string;
  payAmount?: number;
  payCurrency?: string;
  network?: string;
  txId?: string;
  payAddress?: string;
}

export async function createInvoice(
  params: CreateInvoiceParams
): Promise<InvoiceResponse> {
  const res = await fetch(`${OXAPAY_BASE}/merchants/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchant: getMerchantKey(),
      ...params,
    }),
  });

  return res.json();
}

export async function createWhiteLabel(
  params: WhiteLabelParams
): Promise<WhiteLabelResponse> {
  const res = await fetch(`${OXAPAY_BASE}/merchants/request/whitelabel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchant: getMerchantKey(),
      ...params,
    }),
  });

  return res.json();
}

export async function getPaymentStatus(
  trackId: string
): Promise<PaymentStatusResponse> {
  const res = await fetch(`${OXAPAY_BASE}/merchants/inquiry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchant: getMerchantKey(),
      trackId,
    }),
  });

  return res.json();
}

let currenciesCache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function getAcceptedCurrencies() {
  if (currenciesCache && Date.now() - currenciesCache.timestamp < CACHE_TTL) {
    return currenciesCache.data;
  }

  const res = await fetch(`${OXAPAY_BASE}/merchants/allowedCoins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchant: getMerchantKey(),
    }),
  });

  const data = await res.json();
  currenciesCache = { data, timestamp: Date.now() };
  return data;
}

export function validateWebhookHMAC(
  body: string,
  signature: string
): boolean {
  const hmac = crypto
    .createHmac("sha512", getMerchantKey())
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(hmac, "hex"),
    Buffer.from(signature, "hex")
  );
}
