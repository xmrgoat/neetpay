"use client";

import { useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { WalletCard } from "./wallet-card";
import { CryptoAssets } from "./crypto-assets";
import { SwapInterface } from "./swap-interface";

interface Holding {
  currency: string;
  amount: number;
  usdValue: number;
  price?: number;
  change24h?: number;
}

interface Props {
  totalUsd: number;
  change24h: number;
  holdings: Holding[];
}

export function DashboardRightColumn({ totalUsd, change24h, holdings }: Props) {
  const [swapOpen, setSwapOpen] = useState(false);
  const swapRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const openSwap = useCallback(() => {
    setSwapOpen(true);
    requestAnimationFrame(() => {
      if (swapRef.current && contentRef.current) {
        // Slide swap panel in from right
        gsap.fromTo(swapRef.current,
          { x: "100%", opacity: 0 },
          { x: "0%", opacity: 1, duration: 0.4, ease: "power3.out" }
        );
        // Push content out to the left
        gsap.to(contentRef.current,
          { x: "-20%", opacity: 0, duration: 0.35, ease: "power3.out" }
        );
      }
    });
  }, []);

  const closeSwap = useCallback(() => {
    if (swapRef.current && contentRef.current) {
      // Slide swap panel out to the right
      gsap.to(swapRef.current, {
        x: "100%", opacity: 0, duration: 0.35, ease: "power3.in",
      });
      // Bring content back in
      gsap.to(contentRef.current, {
        x: "0%", opacity: 1, duration: 0.4, ease: "power3.out", delay: 0.1,
        onComplete: () => setSwapOpen(false),
      });
    } else {
      setSwapOpen(false);
    }
  }, []);

  return (
    <div className="relative min-h-0 overflow-y-auto overflow-x-hidden lg:col-span-3 pb-4 no-scrollbar">
      {/* ── Normal content (wallet + assets) ── */}
      <div ref={contentRef}>
        {/* Wallet card — sticky at top */}
        <div className="sticky top-0 z-20 pb-2">
          <WalletCard
            totalUsd={totalUsd}
            change24h={change24h}
            holdings={holdings}
            onSwapClick={openSwap}
          />
          {/* Fade mask */}
          <div className="pointer-events-none absolute -bottom-4 left-0 right-0 h-6 bg-gradient-to-b from-surface to-transparent" />
        </div>
        {/* Assets */}
        <div className="relative mt-1">
          <CryptoAssets holdings={holdings} />
        </div>
      </div>

      {/* ── Swap panel overlay — slides from right ── */}
      {swapOpen && (
        <div
          ref={swapRef}
          className="absolute inset-0 z-30 overflow-y-auto no-scrollbar bg-background"
        >
          <SwapInterface holdings={holdings} onBack={closeSwap} />
        </div>
      )}
    </div>
  );
}
