"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

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
      "Add a single endpoint to your checkout. Our REST API handles crypto selection, address generation, and confirmation tracking.",
  },
  {
    number: "03",
    title: "Get paid in crypto",
    description:
      "Funds settle directly to your wallet. Real-time webhook notifications keep your system in sync. No custodial risk.",
  },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current) return;

      const steps = sectionRef.current.querySelectorAll("[data-step]");

      steps.forEach((step, i) => {
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
    <section className="py-24 sm:py-32 border-t border-border">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-20">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Up and running in minutes
          </h2>
          <p className="mt-4 text-lg text-foreground-secondary">
            Three steps. No meetings, no onboarding calls, no compliance reviews.
          </p>
        </div>

        <div ref={sectionRef} className="mx-auto max-w-3xl space-y-16">
          {STEPS.map((step, i) => (
            <div
              key={step.number}
              data-step
              className="flex gap-8 items-start"
            >
              <span className="font-heading text-5xl font-bold text-foreground-muted select-none shrink-0 w-16 tabular-nums">
                {step.number}
              </span>
              <div className="pt-2">
                <h3 className="font-heading text-xl font-semibold mb-3">
                  {step.title}
                </h3>
                <p className="text-foreground-secondary leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
