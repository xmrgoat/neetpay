import { DollarSign, CreditCard, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCard {
  label: string;
  value: string;
  change?: string;
  icon: React.ElementType;
}

const STATS: StatCard[] = [
  {
    label: "Total Revenue",
    value: "$0.00",
    change: "+0%",
    icon: DollarSign,
  },
  {
    label: "Payments",
    value: "0",
    change: "+0%",
    icon: CreditCard,
  },
  {
    label: "Conversion Rate",
    value: "0%",
    change: "+0%",
    icon: TrendingUp,
  },
];

export function OverviewCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {STATS.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-border bg-surface p-6"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-foreground-secondary">
              {stat.label}
            </p>
            <stat.icon size={16} className="text-foreground-muted" />
          </div>
          <p className="mt-3 font-heading text-2xl font-bold tracking-tight">
            {stat.value}
          </p>
          {stat.change && (
            <p className="mt-1 text-xs text-foreground-secondary">
              {stat.change} from last month
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
