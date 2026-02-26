"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Lock, EyeOff, ShieldCheck, KeyRound } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const SECURITY_POINTS = [
  {
    icon: EyeOff,
    title: "Zero KYC",
    description: "Email sign-up only. We never ask for your identity. Your customers stay anonymous too.",
  },
  {
    icon: Lock,
    title: "Cryptographic webhooks",
    description: "Every callback is HMAC-SHA512 signed. Verify it yourself, trust nothing.",
  },
  {
    icon: KeyRound,
    title: "Keys never leave your backend",
    description: "API keys are server-side only. No client-side exposure, no browser leaks.",
  },
  {
    icon: ShieldCheck,
    title: "Non-custodial by design",
    description: "We generate addresses from your public key. We never hold a private key, never touch your funds.",
  },
];

export function SecuritySection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current) return;

      // Left text — scrub fade in/out
      const leftTl = gsap.timeline({
        scrollTrigger: {
          trigger: "[data-sec-left]",
          start: "top 90%",
          end: "top -10%",
          scrub: 2,
        },
      });
      leftTl.fromTo("[data-sec-left]",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.4 }
      );
      leftTl.to("[data-sec-left]",
        { opacity: 0, duration: 0.4 }, 0.6
      );

      // Cards — scrub fade in/out
      const items = sectionRef.current.querySelectorAll("[data-sec-item]");
      items.forEach((item) => {
        const itemTl = gsap.timeline({
          scrollTrigger: {
            trigger: item,
            start: "top 90%",
            end: "top -10%",
            scrub: 2,
          },
        });
        itemTl.fromTo(item,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.4 }
        );
        itemTl.to(item,
          { opacity: 0, duration: 0.4 }, 0.6
        );
      });
    },
    { scope: sectionRef, revertOnUpdate: true }
  );

  return (
    <section ref={sectionRef} className="py-24 sm:py-32 bg-[#0a0a0a] text-[#f5f5f5]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-20 items-start">
          {/* Left — text */}
          <div data-sec-left className="lg:sticky lg:top-32">
            <p className="text-[11px] font-medium text-primary uppercase tracking-widest mb-4">
              Security
            </p>
            <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl leading-[1.1]">
              No one can freeze
              <br />
              your payments.
              <br />
              <span className="text-[#525252]">No one can reject
              <br />
              your business type.</span>
            </h2>
            <p className="mt-6 max-w-md text-lg text-[#a3a3a3] leading-relaxed">
              No email. No name. No address. A wallet sends money. You receive it. That&apos;s the transaction.
            </p>

            {/* Decorative hash */}
            <div className="mt-10 rounded-lg border border-dashed border-[#262626] bg-[#141414] px-4 py-3 max-w-sm">
              <p className="font-mono text-[11px] text-[#525252] leading-relaxed">
                <span className="text-[#666]">sig:</span> HMAC-SHA512(
                <span className="text-primary/60">sk_live_****</span>,
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;payload
                <span className="text-[#666]">)</span> = <span className="text-[#525252]">4a8f3c91...e7b2</span>
              </p>
            </div>
          </div>

          {/* Right — cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {SECURITY_POINTS.map((point) => (
              <div
                key={point.title}
                data-sec-item
                className="rounded-2xl border border-[#262626] bg-[#141414] p-5 transition-colors hover:border-[#333]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1c1c1c] mb-4">
                  <point.icon size={16} className="text-[#525252]" strokeWidth={1.5} />
                </div>
                <h3 className="font-heading text-sm font-semibold mb-2 text-[#e5e5e5]">
                  {point.title}
                </h3>
                <p className="text-[13px] text-[#a3a3a3] leading-relaxed">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
