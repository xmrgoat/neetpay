"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { SUPPORTED_CRYPTOS } from "@/lib/constants";

gsap.registerPlugin(ScrollTrigger);

const CRYPTO_DOTS: Record<string, string> = {
  XMR: "#FF6600",
  BTC: "#F7931A",
  ETH: "#627EEA",
  USDT: "#26A17B",
  USDC: "#2775CA",
  SOL: "#9945FF",
  TRX: "#FF0013",
  BNB: "#F3BA2F",
  LTC: "#BFBBBB",
  DOGE: "#C2A633",
  TON: "#0098EA",
  XRP: "#23292F",
};

export function SocialProofBar() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      const items = containerRef.current.querySelectorAll("[data-crypto]");
      gsap.from(items, {
        opacity: 0,
        y: 8,
        duration: 0.4,
        stagger: 0.03,
        ease: "power3.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 92%",
          toggleActions: "play none none none",
        },
      });
    },
    { scope: containerRef }
  );

  return (
    <section className="border-y border-border bg-surface py-10">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-[10px] font-medium uppercase tracking-[0.2em] text-muted mb-8">
          18+ cryptocurrencies across 5 chains
        </p>
        <div
          ref={containerRef}
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-x-8"
        >
          {SUPPORTED_CRYPTOS.map((crypto) => (
            <div
              key={crypto.symbol}
              data-crypto
              className="flex items-center gap-2 group"
            >
              <div
                className="h-1.5 w-1.5 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: CRYPTO_DOTS[crypto.symbol] || "#555" }}
              />
              <span className="font-mono text-[12px] font-medium text-muted group-hover:text-foreground-secondary transition-colors">
                {crypto.symbol}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
