"use client";

import { useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { WalletCard } from "./wallet-card";
import { CryptoAssets } from "./crypto-assets";
import { SwapInterface } from "./swap-interface";
import { SendInterface } from "./send-interface";
import { ReceiveInterface } from "./receive-interface";

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

type PanelType = "send" | "receive" | "swap";

export function DashboardRightColumn({ totalUsd, change24h, holdings }: Props) {
  const [activePanel, setActivePanel] = useState<PanelType | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);

  const openPanel = useCallback((panel: PanelType) => {
    isAnimating.current = true;
    setActivePanel(panel);
    requestAnimationFrame(() => {
      if (panelRef.current && contentRef.current) {
        gsap.fromTo(panelRef.current,
          { x: "100%", opacity: 0 },
          { x: "0%", opacity: 1, duration: 0.4, ease: "power3.out", onComplete: () => { isAnimating.current = false; gsap.set(panelRef.current, { clearProps: "transform,opacity" }); } }
        );
        gsap.to(contentRef.current,
          { x: "-20%", opacity: 0, duration: 0.35, ease: "power3.out" }
        );
      } else {
        isAnimating.current = false;
      }
    });
  }, []);

  const closePanel = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    if (panelRef.current && contentRef.current) {
      gsap.to(panelRef.current, {
        x: "100%", opacity: 0, duration: 0.35, ease: "power3.in",
      });
      gsap.to(contentRef.current, {
        x: "0%", opacity: 1, duration: 0.4, ease: "power3.out", delay: 0.1,
        onComplete: () => { setActivePanel(null); isAnimating.current = false; },
      });
    } else {
      setActivePanel(null);
      isAnimating.current = false;
    }
  }, []);

  const switchPanel = useCallback((panel: PanelType) => {
    if (isAnimating.current) return;

    // Clicking the same active tab → close
    if (activePanel === panel) {
      closePanel();
      return;
    }

    // Already open → cross-fade
    if (activePanel) {
      isAnimating.current = true;
      if (panelRef.current) {
        gsap.to(panelRef.current, {
          opacity: 0, duration: 0.15, ease: "power2.in",
          onComplete: () => {
            setActivePanel(panel);
            requestAnimationFrame(() => {
              if (panelRef.current) {
                gsap.fromTo(panelRef.current,
                  { opacity: 0 },
                  { opacity: 1, duration: 0.2, ease: "power2.out", onComplete: () => { isAnimating.current = false; gsap.set(panelRef.current, { clearProps: "transform,opacity" }); } }
                );
              } else {
                isAnimating.current = false;
              }
            });
          },
        });
      }
      return;
    }

    // Nothing open → slide in
    openPanel(panel);
  }, [activePanel, openPanel, closePanel]);

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
            onSendClick={() => switchPanel("send")}
            onReceiveClick={() => switchPanel("receive")}
            onSwapClick={() => switchPanel("swap")}
          />
          {/* Fade mask */}
          <div className="pointer-events-none absolute -bottom-4 left-0 right-0 h-6 bg-gradient-to-b from-surface to-transparent" />
        </div>
        {/* Assets */}
        <div className="relative mt-1">
          <CryptoAssets holdings={holdings} />
        </div>
      </div>

      {/* ── Panel overlay — slides from right ── */}
      {activePanel && (
        <div
          ref={panelRef}
          className="absolute inset-0 z-30 overflow-y-auto no-scrollbar bg-background"
        >
          {activePanel === "swap" && (
            <SwapInterface holdings={holdings} onBack={closePanel} activePanel={activePanel} onSwitchPanel={switchPanel} />
          )}
          {activePanel === "send" && (
            <SendInterface holdings={holdings} onBack={closePanel} activePanel={activePanel} onSwitchPanel={switchPanel} />
          )}
          {activePanel === "receive" && (
            <ReceiveInterface holdings={holdings} onBack={closePanel} activePanel={activePanel} onSwitchPanel={switchPanel} />
          )}
        </div>
      )}
    </div>
  );
}
