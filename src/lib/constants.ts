export const SITE_NAME = "neetpay";
export const SITE_TAGLINE = "Pay without permission.";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const PRICING_PLANS = {
  free: {
    name: "Free",
    price: 0,
    priceAnnual: 0,
    description: "For testing and small projects.",
    features: [
      "Up to 100 transactions/month",
      "Standard API access",
      "Email support",
      "Community resources",
    ],
  },
  pro: {
    name: "Pro",
    price: 29,
    priceAnnual: 290,
    description: "For growing businesses.",
    features: [
      "Unlimited transactions",
      "White-label checkout",
      "Priority support",
      "Webhook notifications",
      "Advanced analytics",
      "Custom branding",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: 99,
    priceAnnual: 990,
    description: "For large-scale operations.",
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "IP whitelisting",
      "Multi-user access",
    ],
  },
} as const;

export const PAYMENT_STATUSES = [
  "new",
  "waiting",
  "paying",
  "paid",
  "expired",
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
