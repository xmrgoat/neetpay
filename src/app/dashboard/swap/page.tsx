import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SwapInterface } from "@/components/dashboard/swap-interface";

const fakeHoldings = [
  { currency: "BTC", amount: 0.4218, usdValue: 28_420.80, price: 67_380, change24h: 2.34 },
  { currency: "ETH", amount: 3.8741, usdValue: 12_840.50, price: 3_315, change24h: -1.12 },
  { currency: "XMR", amount: 42.156, usdValue: 6_890.20, price: 163.50, change24h: 4.87 },
  { currency: "SOL", amount: 18.42, usdValue: 3_210.00, price: 174.26, change24h: 1.56 },
  { currency: "USDT", amount: 2_893.04, usdValue: 2_893.04, price: 1.00, change24h: 0.01 },
  { currency: "USDC", amount: 0, usdValue: 0, price: 1.00, change24h: 0.00 },
  { currency: "TRX", amount: 0, usdValue: 0, price: 0.124, change24h: -0.87 },
  { currency: "BNB", amount: 0, usdValue: 0, price: 608.30, change24h: 1.23 },
  { currency: "LTC", amount: 0, usdValue: 0, price: 84.50, change24h: -2.15 },
  { currency: "DOGE", amount: 0, usdValue: 0, price: 0.162, change24h: 5.42 },
  { currency: "TON", amount: 0, usdValue: 0, price: 5.82, change24h: 3.18 },
  { currency: "XRP", amount: 0, usdValue: 0, price: 0.62, change24h: -0.54 },
];

export default async function SwapPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <SwapInterface holdings={fakeHoldings} />;
}
