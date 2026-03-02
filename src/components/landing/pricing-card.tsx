import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
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
  const period = annual ? "/yr" : "/mo";
  const isEnterprise = name === "Enterprise";
  const isFree = name === "Starter";
  const savingsAmount =
    recommended && annual && price > 0 ? price * 12 - priceAnnual : 0;

  const ctaLabel = isEnterprise
    ? "Talk to us"
    : isFree
      ? "Start for free"
      : "Start Pro — cancel anytime";

  const ctaHref = isEnterprise ? "mailto:hello@neetpay.com" : "/register";

  // Pro card with glass treatment
  if (recommended) {
    return (
      <div
        className="relative flex flex-col glass glass-primary rounded-2xl p-8"
      >
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold text-white uppercase tracking-widest whitespace-nowrap">
          Most Popular
        </span>

        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-primary">
          {name}
        </p>

        <div className="mt-5 mb-1 flex items-end gap-2">
          {currentPrice === 0 ? (
            <p className="font-heading text-4xl font-bold">Free</p>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-4xl font-bold tabular-nums">
                ${currentPrice}
              </span>
              <span className="text-sm text-foreground-secondary">{period}</span>
            </div>
          )}
          {savingsAmount > 0 && (
            <span className="mb-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">
              Save ${savingsAmount}
            </span>
          )}
        </div>

        <p className="text-sm text-foreground-secondary mb-8 mt-3 leading-relaxed">
          {description}
        </p>

        <Link href={ctaHref} className="mb-8">
          <Button variant="primary" size="lg" className="w-full">
            {ctaLabel}
          </Button>
        </Link>

        <ul className="space-y-3 flex-1">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-3 text-sm text-foreground-secondary"
            >
              <Check size={14} className="shrink-0 mt-0.5 text-primary" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Standard cards (Free / Enterprise)
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border border-border bg-surface p-8 transition-colors hover:border-border-hover"
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted">
        {name}
      </p>

      <div className="mt-5 mb-4">
        {isEnterprise ? (
          <p className="font-heading text-4xl font-bold">Custom</p>
        ) : currentPrice === 0 ? (
          <p className="font-heading text-4xl font-bold">Free</p>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="font-heading text-4xl font-bold tabular-nums">
              ${currentPrice}
            </span>
            <span className="text-sm text-foreground-secondary">{period}</span>
          </div>
        )}
      </div>

      <p className="text-sm text-foreground-secondary mb-8 leading-relaxed">
        {description}
      </p>

      <Link href={ctaHref} className="mb-8">
        <Button
          variant={isEnterprise ? "ghost" : "secondary"}
          size="lg"
          className={cn("w-full", isEnterprise && "border border-border")}
        >
          {ctaLabel}
        </Button>
      </Link>

      <ul className="space-y-3 flex-1">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-3 text-sm text-foreground-secondary"
          >
            <Check size={14} className="shrink-0 mt-0.5 text-muted" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
