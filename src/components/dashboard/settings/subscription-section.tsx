import Link from "next/link";
import { Check } from "lucide-react";
import { PRICING_PLANS } from "@/lib/constants";
import { Button } from "@/components/ui/button";

interface SubscriptionSectionProps {
  plan: string;
  subscription: {
    status: string;
    endDate: string | null;
  } | null;
}

export function SubscriptionSection({
  plan,
  subscription,
}: SubscriptionSectionProps) {
  const planKey = plan as keyof typeof PRICING_PLANS;
  const planData = PRICING_PLANS[planKey] ?? PRICING_PLANS.free;

  return (
    <section className="rounded-xl border border-border bg-elevated p-6">
      <h2 className="font-heading text-base font-medium mb-4">
        Plan & Billing
      </h2>

      <div className="space-y-4">
        {/* Plan name + badge */}
        <div className="flex items-center gap-3">
          <span className="font-heading text-lg font-semibold text-foreground">
            {planData.name}
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {plan === "free" ? "Current" : "Active"}
          </span>
        </div>

        {/* Price */}
        {planData.price > 0 && (
          <p className="text-sm text-foreground-secondary">
            <span className="font-heading text-xl font-semibold text-foreground">
              ${planData.price}
            </span>
            /month
          </p>
        )}

        {/* Renewal date */}
        {subscription?.endDate && (
          <p className="text-xs text-foreground-secondary">
            Renews on{" "}
            <span className="text-foreground">
              {new Date(subscription.endDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </p>
        )}

        {/* Features */}
        <ul className="space-y-2 pt-2">
          {planData.features.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2.5 text-sm text-foreground-secondary"
            >
              <Check size={14} className="shrink-0 text-primary" />
              {feature}
            </li>
          ))}
        </ul>

        {/* Upgrade CTA */}
        {plan === "free" && (
          <div className="pt-2">
            <Link href="/pricing">
              <Button variant="primary" size="sm">
                Upgrade plan
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
