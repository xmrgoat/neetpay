export const SITE_NAME = "neetpay";
export const SITE_TAGLINE = "Pay without permission.";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const PRICING_PLANS = {
  free: {
    name: "Starter",
    price: 0,
    priceAnnual: 0,
    description: "100 transactions/month — enough to ship and validate.",
    features: [
      "Full API access (all endpoints)",
      "All 18+ cryptocurrencies",
      "Webhook notifications",
      "Email support",
    ],
  },
  pro: {
    name: "Pro",
    price: 29,
    priceAnnual: 290,
    description: "Flat fee, not a percentage. Your revenue stays yours.",
    features: [
      "Unlimited transactions — no caps, ever",
      "Your brand on checkout (white-label)",
      "Instant webhook alerts with delivery logs",
      "12-month analytics + export",
      "Priority support, < 4h response",
      "Custom domain checkout pages",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: 0,
    priceAnnual: 0,
    description: "Custom pricing for high-volume operations.",
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "Custom integrations + SLA guarantee",
      "IP whitelisting + SSO",
      "Multi-user access with role management",
      "Self-hosted deployment support",
    ],
  },
} as const;

export const PAYMENT_STATUSES = [
  "pending",
  "confirming",
  "paid",
  "expired",
  "failed",
  "underpaid",
  "refunded",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const NAV_LINKS = [
  { label: "Products", href: "#products" },
  { label: "Developers", href: "#developers" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
] as const;

export const DASHBOARD_NAV = [
  { label: "Overview", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Wallet", href: "/dashboard/wallet", icon: "Wallet" },
  { label: "Swap", href: "/dashboard/swap", icon: "Repeat" },
  { label: "Payments", href: "/dashboard/payments", icon: "ArrowLeftRight" },
  { label: "Payment Links", href: "/dashboard/links", icon: "Link" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "BarChart3" },
  { label: "Developers", href: "/dashboard/developers", icon: "Code" },
  { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
] as const;

export const PAYMENT_STATUS_CONFIG = {
  pending: { label: "Pending", color: "#eab308" },
  confirming: { label: "Confirming", color: "#3b82f6" },
  paid: { label: "Paid", color: "#22c55e" },
  expired: { label: "Expired", color: "#737373" },
  failed: { label: "Failed", color: "#ef4444" },
  underpaid: { label: "Underpaid", color: "#FF6600" },
  refunded: { label: "Refunded", color: "#a855f7" },
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
  MATIC: "#8247E5",
};

export const SUPPORTED_CRYPTOS = [
  { symbol: "XMR", name: "Monero" },
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "USDT", name: "Tether" },
  { symbol: "USDC", name: "USD Coin" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "TRX", name: "Tron" },
  { symbol: "BNB", name: "BNB" },
  { symbol: "LTC", name: "Litecoin" },
  { symbol: "DOGE", name: "Dogecoin" },
  { symbol: "TON", name: "Toncoin" },
  { symbol: "XRP", name: "Ripple" },
] as const;
