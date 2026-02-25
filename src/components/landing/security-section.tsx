"use client";

import { Lock, EyeOff, Server, ShieldCheck } from "lucide-react";
import { useStaggerChildren } from "@/hooks/use-stagger-children";

const SECURITY_POINTS = [
  {
    icon: EyeOff,
    title: "Zero KYC",
    description: "Email sign-up only. We never ask for your identity.",
  },
  {
    icon: Lock,
    title: "HMAC-SHA512 webhooks",
    description:
      "Every callback is cryptographically signed. Verify every request.",
  },
  {
    icon: Server,
    title: "Server-side keys only",
    description:
      "API keys never touch the client. All sensitive calls stay on your backend.",
  },
  {
    icon: ShieldCheck,
    title: "Non-custodial option",
    description:
      "Direct-to-wallet settlements available. We don't hold your funds.",
  },
];

export function SecuritySection() {
  const gridRef = useStaggerChildren<HTMLDivElement>("[data-security-item]");

  return (
    <section className="py-24 sm:py-32 bg-[#0a0a0a] text-[#f5f5f5]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Privacy is not a feature.
            <br />
            <span className="text-primary">It's a right.</span>
          </h2>
          <p className="mt-4 text-lg text-[#a3a3a3]">
            Built for merchants who believe their customers' data is not a product.
          </p>
        </div>

        <div
          ref={gridRef}
          className="grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto"
        >
          {SECURITY_POINTS.map((point) => (
            <div
              key={point.title}
              data-security-item
              className="flex gap-4 rounded-xl border border-[#262626] bg-[#141414] p-6"
            >
              <point.icon
                size={20}
                className="text-[#525252] shrink-0 mt-0.5"
                strokeWidth={1.5}
              />
              <div>
                <h3 className="font-heading text-sm font-semibold mb-1.5">
                  {point.title}
                </h3>
                <p className="text-sm text-[#a3a3a3] leading-relaxed">
                  {point.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Redacted hash */}
        <div className="mt-12 text-center">
          <p className="font-mono text-xs text-[#525252] tracking-wider">
            tx: 4a8f3c91****...****e7b2d04e
          </p>
        </div>
      </div>
    </section>
  );
}
