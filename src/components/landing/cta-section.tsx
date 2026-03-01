"use client";

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
          Start getting paid.
        </h2>
        <p className="mt-4 text-lg text-foreground-secondary">
          Free tier. No credit card. Takes 30 seconds.
        </p>
        <div className="mt-8 flex items-center justify-center">
          <Link href="/register" className="btn-rainbow rounded-full cursor-pointer">
            <div className="btn-rainbow-inner flex items-center justify-center h-14 px-10 rounded-full">
              <span className="font-semibold text-lg">Create your account</span>
              <ArrowRight className="w-5 h-5 ml-2 text-black" />
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
