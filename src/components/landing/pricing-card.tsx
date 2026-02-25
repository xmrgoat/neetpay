import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Minus } from "lucide-react";
import Link from "next/link";

interface PricingCardProps {
  name: string;
  price: number;
  priceAnnual: number;
  description: string;
  features: readonly string[];
  recommended?: boolean;
  annual: boolean;
}

export function PricingCard({
  name,
  price,
  priceAnnual,
  description,
  features,
  recommended,
  annual,
}: PricingCardProps) {
  const currentPrice = annual ? priceAnnual : price;
  const period = annual ? "/year" : "/month";
  const isEnterprise = name === "Enterprise";

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border border-border bg-surface p-8",
        recommended && "border-t-2 border-t-primary"
      )}
    >
      {recommended && (
        <span className="absolute -top-3 left-6 rounded-md bg-primary px-2.5 py-0.5 text-[11px] font-medium text-black uppercase tracking-wider">
          Recommended
        </span>
      )}

      {/* Plan name */}
      <p className="text-xs font-medium uppercase tracking-widest text-foreground-secondary">
        {name}
      </p>

      {/* Price */}
      <div className="mt-5 mb-4">
        {isEnterprise ? (
          <p className="font-heading text-4xl font-bold">Custom</p>
        ) : currentPrice === 0 ? (
          <p className="font-heading text-4xl font-bold">Free</p>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="font-heading text-4xl font-bold">
              ${currentPrice}
            </span>
            <span className="text-sm text-foreground-secondary">{period}</span>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-foreground-secondary mb-8">{description}</p>

      {/* CTA */}
      <Link href={isEnterprise ? "#contact" : "/register"} className="mb-8">
        <Button
          variant={recommended ? "primary" : "secondary"}
          className="w-full"
        >
          {isEnterprise ? "Contact us" : "Get started"}
        </Button>
      </Link>

      {/* Features */}
      <ul className="space-y-3 flex-1">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-3 text-sm text-foreground-secondary"
          >
            <Minus size={14} className="shrink-0 mt-1 text-foreground-muted" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
