import type { PaymentStatus } from "@/lib/constants";

export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: "free" | "pro" | "enterprise";
  webhookUrl: string | null;
  webhookSecret: string | null;
  createdAt: Date;
}

export interface Payment {
  id: string;
  userId: string;
  trackId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description: string | null;

  // Chain/crypto details
  chain: string | null;
  payCurrency: string | null;
  payAmount: number | null;
  expectedPayAmount: number | null;
  payAddress: string | null;
  network: string | null;
  tokenContract: string | null;

  // Transaction details
  txId: string | null;
  senderAddress: string | null;
  confirmations: number;
  requiredConfs: number;

  // Wallet derivation
  derivationIndex: number | null;

  expiresAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  paymentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  lastUsed: Date | null;
  createdAt: Date;
}

export interface WalletAddress {
  id: string;
  chain: string;
  address: string;
  derivationIndex: number;
  paymentId: string | null;
  createdAt: Date;
}

export interface WebhookLog {
  id: string;
  userId: string;
  paymentId: string | null;
  url: string;
  payload: string;
  status: number;
  success: boolean;
  duration: number;
  retryCount: number;
  nextRetryAt: Date | null;
  createdAt: Date;
}

// Chain provider types

export interface ChainConfig {
  chain: string;
  name: string;
  native: boolean;
  tokenContract?: string;
  network: string;
  requiredConfirmations: number;
  explorerBaseUrl: string;
}

export interface PaymentCheck {
  txHash: string;
  amount: number;
  confirmations: number;
  from: string;
  timestamp: number;
  tokenContract?: string;
}
