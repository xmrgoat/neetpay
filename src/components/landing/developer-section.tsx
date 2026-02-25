"use client";

import { CodeBlock } from "@/components/ui/code-block";
import { useRevealOnScroll } from "@/hooks/use-reveal-on-scroll";

const CODE_EXAMPLE = `const payment = await fetch("https://api.neetpay.com/v1/payment", {
  method: "POST",
  headers: {
    "Authorization": "Bearer np_live_...",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    amount: 29.99,
    currency: "USD",
  }),
});

const { payment_url } = await payment.json();
// Redirect customer to payment_url`;

export function DeveloperSection() {
  const sectionRef = useRevealOnScroll<HTMLDivElement>();

  return (
    <section id="developers" className="py-24 sm:py-32">
      <div ref={sectionRef} className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Text */}
          <div>
            <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Ship in minutes,
              <br />
              not weeks.
            </h2>
            <p className="mt-6 text-lg text-foreground-secondary leading-relaxed max-w-md">
              A single REST endpoint creates a payment. Webhooks notify your
              server when funds arrive. No SDKs to install, no libraries to
              learn.
            </p>
            <div className="mt-8 flex items-center gap-6">
              <div>
                <p className="font-heading text-2xl font-bold">1</p>
                <p className="text-xs text-foreground-secondary uppercase tracking-widest mt-1">
                  Endpoint
                </p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="font-heading text-2xl font-bold">5 min</p>
                <p className="text-xs text-foreground-secondary uppercase tracking-widest mt-1">
                  Integration
                </p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="font-heading text-2xl font-bold">0</p>
                <p className="text-xs text-foreground-secondary uppercase tracking-widest mt-1">
                  Dependencies
                </p>
              </div>
            </div>
          </div>

          {/* Code */}
          <CodeBlock
            code={CODE_EXAMPLE}
            language="typescript"
            filename="checkout.ts"
          />
        </div>
      </div>
    </section>
  );
}
