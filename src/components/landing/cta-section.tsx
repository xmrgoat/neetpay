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
        <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
          Deploy your first payment.
        </h2>
        <p className="mt-4 text-lg text-foreground-secondary">
          No credit card. No onboarding call. No compliance review. Just code.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/register" className="w-full sm:w-auto">
            <Button size="lg" className="h-12 w-full sm:w-auto px-8 text-base font-semibold">
              Start accepting payments
              <ArrowRight size={16} />
            </Button>
          </Link>
          <Link href="/docs" className="w-full sm:w-auto">
            <Button variant="secondary" size="lg" className="h-12 w-full sm:w-auto px-8">
              Read the docs
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted">
          Free up to 100 transactions/month. No vendor lock-in.
        </p>
      </div>
    </section>
  );
}
