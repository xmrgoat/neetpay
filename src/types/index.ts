export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: "free" | "pro" | "enterprise";
  createdAt: Date;
}

export interface Payment {
  id: string;
  userId: string;
  trackId: string;
  orderId: string;
  amount: number;
  currency: string;
  planType: string;
  status:
    | "new"
    | "waiting"
    | "paying"
    | "paid"
    | "expired"
    | "underpaid"
    | "refunded";
  oxapayData: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  paymentId: string;
  startsAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface ApiKey {
  id: string;
  userId: string;
  keyHash: string;
  name: string;
  permissions: string[];
  createdAt: Date;
}

// OxaPay API types

export interface OxaPayInvoiceRequest {
  amount: number;
  currency: string;
  lifetime?: number;
  callback_url: string;
  return_url: string;
  order_id: string;
  email?: string;
  thanks_message?: string;
  description?: string;
}

export interface OxaPayInvoiceResponse {
  track_id: string;
  payment_url: string;
  expired_at: string;
}

export interface OxaPayWhiteLabelRequest {
  amount: number;
  currency: string;
  pay_currency: string;
  network: string;
  lifetime?: number;
  callback_url: string;
  order_id: string;
  email?: string;
  description?: string;
}

export interface OxaPayWhiteLabelResponse {
  track_id: string;
  address: string;
  pay_amount: number;
  qr_code: string;
  rate: number;
  expired_at: string;
}

export interface OxaPayWebhookPayload {
  track_id: string;
  status: string;
  amount: number;
  currency: string;
  order_id: string;
  email?: string;
  txs?: Array<{
    tx_hash: string;
    amount: number;
    confirmations: number;
  }>;
}
