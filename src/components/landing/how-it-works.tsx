"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    number: "01",
    title: "Create an account",
    description:
      "Sign up with just an email. No KYC, no verification delays. Get your API key in seconds.",
  },
  {
    number: "02",
    title: "Integrate the API",
    description:
      "One POST request to create a payment. Our API generates a unique receiving address and tracks confirmations automatically.",
  },
  {
    number: "03",
    title: "Get paid in crypto",
    description:
      "Funds settle directly to the wallet address you configure. We generate unique addresses from your public key — we never hold a private key.",
  },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current) return;

      const steps = sectionRef.current.querySelectorAll("[data-step]");
      steps.forEach((step) => {
        gsap.from(step, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: step,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        });
      });
    },
    { scope: sectionRef }
  );

  return (
    <section id="how-it-works" className="py-24 sm:py-32 border-t border-border">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Up and running in minutes
          </h2>
          <p className="mt-4 text-lg text-foreground-secondary max-w-lg">
            Three steps. No meetings, no onboarding calls, no compliance reviews.
          </p>
        </div>

        <div ref={sectionRef} className="mx-auto max-w-4xl">
          {STEPS.map((step, i) => (
            <div
              key={step.number}
              data-step
              className="flex gap-8 items-start group"
            >
              {/* Number + vertical line */}
              <div className="flex flex-col items-center shrink-0">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface font-heading text-sm font-bold text-muted tabular-nums group-hover:border-border-hover group-hover:text-foreground-secondary transition-colors">
                  {step.number}
                </span>
                {i < STEPS.length - 1 && (
                  <div className="w-px flex-1 bg-border my-2 min-h-12" />
                )}
              </div>

              {/* Content */}
              <div className={`pt-2 ${i < STEPS.length - 1 ? "pb-12" : "pb-0"}`}>
                <h3 className="font-heading text-xl font-semibold mb-3">
                  {step.title}
                </h3>
                <p className="text-foreground-secondary leading-relaxed max-w-md">
                  {step.description}
                </p>
              </div>
            </div>
          ))}

          {/* CTA after final step */}
          <div className="ml-20 mt-10">
            <Link href="/register">
              <Button size="lg" className="h-12 px-8 text-base font-semibold">
                Create your account — takes 30 seconds
                <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
