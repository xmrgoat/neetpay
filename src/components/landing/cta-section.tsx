"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useRevealOnScroll } from "@/hooks/use-reveal-on-scroll";
import Link from "next/link";

export function CtaSection() {
  const sectionRef = useRevealOnScroll<HTMLDivElement>();

  return (
    <section className="py-24 sm:py-32 bg-surface border-t border-border">
      <div
        ref={sectionRef}
        className="mx-auto max-w-2xl px-6 text-center"
      >
        <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Start accepting crypto today.
        </h2>
        <p className="mt-4 text-lg text-foreground-secondary">
          No credit card required. No onboarding process. Just code and go.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg">
              Get Started
              <ArrowRight size={16} />
            </Button>
          </Link>
          <Link href="/docs">
            <Button variant="secondary" size="lg">
              Read the docs
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
