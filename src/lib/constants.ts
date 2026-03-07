export const SITE_NAME = "neetpay";
export const SITE_TAGLINE = "Pay without permission.";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const PRICING_PLANS = {
  free: {
    name: "Starter",
    price: 0,
    priceAnnual: 0,
    description: "100 tx/month. All features. No credit card.",
    features: [
      "Full API + all supported cryptocurrencies",
      "Webhook notifications",
      "Payment links",
      "Email support",
    ],
  },
  pro: {
    name: "Pro",
    price: 29,
    priceAnnual: 290,
    description: "Flat fee. Not a percentage. Your revenue stays yours.",
    features: [
      "Unlimited transactions",
      "White-label checkout + custom domain",
      "Webhook delivery logs",
      "12-month analytics + export",
      "Priority support, < 4h response",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: 0,
    priceAnnual: 0,
    description: "For high-volume operations.",
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "SLA guarantee + custom integrations",
      "Self-hosted deployment support",
    ],
  },
} as const;

export const INVOICE_STATUSES = [
  "pending",
  "swap_pending",
  "confirming",
  "paid",
  "expired",
  "failed",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const NAV_LINKS = [
  { label: "Products", href: "#products" },
  { label: "Developers", href: "#developers" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
] as const;

export const DASHBOARD_NAV = [
  { label: "Overview", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Invoices", href: "/dashboard/invoices", icon: "FileText" },
  { label: "Payment Links", href: "/dashboard/links", icon: "Link" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "BarChart3" },
  { label: "Spend", href: "/dashboard/spend", icon: "CreditCard" },
  { label: "Developers", href: "/dashboard/developers", icon: "Code" },
  { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
] as const;

export const INVOICE_STATUS_CONFIG = {
  pending: { label: "Pending", color: "#eab308" },
  swap_pending: { label: "Swap Pending", color: "#f97316" },
  confirming: { label: "Confirming", color: "#3b82f6" },
  paid: { label: "Paid", color: "#22c55e" },
  expired: { label: "Expired", color: "#737373" },
  failed: { label: "Failed", color: "#ef4444" },
} as const;

export const CRYPTO_COLORS: Record<string, string> = {
  BTC: "#F7931A",
  ETH: "#627EEA",
  SOL: "#9945FF",
  XMR: "#FF6600",
  TRX: "#FF0013",
  BNB: "#F3BA2F",
  USDT: "#26A17B",
  USDC: "#2775CA",
  LTC: "#BFBBBB",
  DOGE: "#C2A633",
  ARB: "#28A0F0",
};

export const SUPPORTED_CRYPTOS = [
  { symbol: "XMR", name: "Monero", chain: "xmr", provider: "direct" },
  { symbol: "BTC", name: "Bitcoin", chain: "btc", provider: "wagyu" },
  { symbol: "ETH", name: "Ethereum", chain: "arbitrum", provider: "wagyu" },
  { symbol: "USDC", name: "USD Coin", chain: "arbitrum", provider: "wagyu" },
  { symbol: "USDT", name: "Tether", chain: "arbitrum", provider: "wagyu" },
  { symbol: "SOL", name: "Solana", chain: "solana", provider: "wagyu" },
  { symbol: "TRX", name: "Tron", chain: "tron", provider: "trocador" },
  { symbol: "BNB", name: "BNB", chain: "bsc", provider: "trocador" },
] as const;
