"use client";

import { useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { WalletCard } from "./wallet-card";
import { CryptoAssets } from "./crypto-assets";
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
  walletAddress?: string;
}

type PanelType = "send" | "receive";

export function DashboardRightColumn({ totalUsd, change24h, holdings, walletAddress }: Props) {
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

    if (activePanel === panel) {
      closePanel();
      return;
    }

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

    openPanel(panel);
  }, [activePanel, openPanel, closePanel]);

  return (
    <div className="relative min-h-0 overflow-y-auto overflow-x-hidden lg:col-span-3 pb-4 no-scrollbar">
      {/* Normal content (wallet + assets) */}
      <div ref={contentRef} className="flex flex-col gap-3">
        {/* Wallet card */}
        <div className="sticky top-0 z-20 pb-1">
          <WalletCard
            totalUsd={totalUsd}
            change24h={change24h}
            holdings={holdings}
            walletAddress={walletAddress}
            onSendClick={() => switchPanel("send")}
            onReceiveClick={() => switchPanel("receive")}
          />
          <div className="pointer-events-none absolute -bottom-3 left-0 right-0 h-5 bg-gradient-to-b from-surface to-transparent" />
        </div>
        {/* Assets */}
        <div className="relative">
          <CryptoAssets holdings={holdings} />
        </div>
      </div>

      {/* Panel overlay */}
      {activePanel && (
        <div
          ref={panelRef}
          className="absolute inset-0 z-30 overflow-y-auto no-scrollbar bg-background"
        >
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
