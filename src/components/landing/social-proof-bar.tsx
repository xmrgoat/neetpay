"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SUPPORTED_CRYPTOS } from "@/lib/constants";

gsap.registerPlugin(ScrollTrigger);

export function SocialProofBar() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      const items = containerRef.current.querySelectorAll("[data-crypto]");
      gsap.from(items, {
        opacity: 0,
        y: 10,
        duration: 0.5,
        stagger: 0.04,
        ease: "power3.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 90%",
          toggleActions: "play none none none",
        },
      });
    },
    { scope: containerRef }
  );

  return (
    <section className="border-y border-border bg-surface py-8">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-foreground-secondary mb-6">
          Accept 18+ cryptocurrencies
        </p>
        <div
          ref={containerRef}
          className="flex flex-wrap items-center justify-center gap-6 sm:gap-8"
        >
          {SUPPORTED_CRYPTOS.map((crypto) => (
            <div
              key={crypto.symbol}
              data-crypto
              className="flex items-center gap-2 text-foreground-secondary"
            >
              <span className="font-mono text-sm font-medium">
                {crypto.symbol}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
