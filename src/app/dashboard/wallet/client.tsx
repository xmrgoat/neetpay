"use client";

import { useRef, useState, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { BarChart3, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { WalletCard } from "@/components/dashboard/wallet-card";
import { CryptoAssets } from "@/components/dashboard/crypto-assets";
import { SwapInterface } from "@/components/dashboard/swap-interface";
import { SendInterface } from "@/components/dashboard/send-interface";
import { ReceiveInterface } from "@/components/dashboard/receive-interface";
import { QuickStats } from "@/components/dashboard/wallet/quick-stats";
import { WalletTransactions } from "@/components/dashboard/wallet/wallet-transactions";
import type { WalletBalance } from "@/types/wallet";

type PanelType = "send" | "receive" | "swap";
type TabType = "assets" | "activity";

interface Holding {
  currency: string;
  amount: number;
  usdValue: number;
  price?: number;
  change24h?: number;
}

interface WalletPageClientProps {
  wallet: WalletBalance;
  holdings: Holding[];
  totalUsd: number;
  change24hUsd: number;
  walletAddress?: string;
}

export function WalletPageClient({
  wallet,
  holdings,
  totalUsd,
  change24hUsd,
  walletAddress,
}: WalletPageClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tabContentRef = useRef<HTMLDivElement>(null);

  const [activePanel, setActivePanel] = useState<PanelType | null>("swap");
  const [activeTab, setActiveTab] = useState<TabType>("assets");
  const isAnimating = useRef(false);

  // ── Page entrance animation ──────────────────────────────────────────────
  useGSAP(
    () => {
      if (!containerRef.current) return;
      const tl = gsap.timeline();

      tl.fromTo(
        "[data-page-header]",
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
      );
      tl.fromTo(
        "[data-left-col]",
        { opacity: 0, y: 20, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out" },
        0.1,
      );
      tl.fromTo(
        "[data-right-col]",
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" },
        0.15,
      );
    },
    { scope: containerRef },
  );

  // ── Action panel management ──────────────────────────────────────────────
  const openPanel = useCallback((panel: PanelType) => {
    isAnimating.current = true;
    setActivePanel(panel);
    requestAnimationFrame(() => {
      if (panelRef.current) {
        gsap.fromTo(
          panelRef.current,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.4,
            ease: "power3.out",
            onComplete: () => {
              isAnimating.current = false;
            },
          },
        );
      } else {
        isAnimating.current = false;
      }
    });
  }, []);

  const closePanel = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    if (panelRef.current) {
      gsap.to(panelRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.3,
        ease: "power3.in",
        onComplete: () => {
          setActivePanel(null);
          isAnimating.current = false;
        },
      });
    } else {
      setActivePanel(null);
      isAnimating.current = false;
    }
  }, []);

  const switchPanel = useCallback(
    (panel: PanelType) => {
      if (isAnimating.current) return;

      if (activePanel === panel) {
        closePanel();
        return;
      }

      if (activePanel) {
        isAnimating.current = true;
        if (panelRef.current) {
          gsap.to(panelRef.current, {
            opacity: 0,
            duration: 0.15,
            ease: "power2.in",
            onComplete: () => {
              setActivePanel(panel);
              requestAnimationFrame(() => {
                if (panelRef.current) {
                  gsap.fromTo(
                    panelRef.current,
                    { opacity: 0 },
                    {
                      opacity: 1,
                      duration: 0.2,
                      ease: "power2.out",
                      onComplete: () => {
                        isAnimating.current = false;
                      },
                    },
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
    },
    [activePanel, openPanel, closePanel],
  );

  // ── Tab switching ────────────────────────────────────────────────────────
  const handleTabSwitch = useCallback(
    (tab: TabType) => {
      if (tab === activeTab) return;

      if (tabContentRef.current) {
        gsap.to(tabContentRef.current, {
          opacity: 0,
          y: -8,
          duration: 0.15,
          ease: "power2.in",
          onComplete: () => {
            setActiveTab(tab);
            requestAnimationFrame(() => {
              if (tabContentRef.current) {
                gsap.fromTo(
                  tabContentRef.current,
                  { opacity: 0, y: 8 },
                  { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" },
                );
              }
            });
          },
        });
      } else {
        setActiveTab(tab);
      }
    },
    [activeTab],
  );

  return (
    <div ref={containerRef} className="h-full overflow-y-auto no-scrollbar pb-6">
      {/* Page header */}
      <div data-page-header className="mb-5">
        <h1 className="font-heading text-lg font-semibold text-foreground">
          Wallet
        </h1>
        <p className="text-xs text-muted mt-0.5">
          Manage your crypto balances
        </p>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* ── LEFT — Assets / Activity ── */}
        <div data-left-col className="lg:col-span-7 min-h-0">
          {/* Tab bar */}
          <div className="flex items-center gap-1 border-b border-border mb-4">
            <button
              onClick={() => handleTabSwitch("assets")}
              className={cn(
                "relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === "assets"
                  ? "text-foreground"
                  : "text-muted hover:text-foreground-secondary",
              )}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Assets
              {activeTab === "assets" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
            <button
              onClick={() => handleTabSwitch("activity")}
              className={cn(
                "relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === "activity"
                  ? "text-foreground"
                  : "text-muted hover:text-foreground-secondary",
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              Activity
              {activeTab === "activity" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          </div>

          <div ref={tabContentRef}>
            {activeTab === "assets" && (
              <CryptoAssets holdings={holdings} expanded />
            )}
            {activeTab === "activity" && <WalletTransactions />}
          </div>
        </div>

        {/* ── RIGHT — Wallet Card + Stats + Action Panel ── */}
        <div data-right-col className="lg:col-span-5">
          <WalletCard
            totalUsd={totalUsd}
            change24h={change24hUsd}
            holdings={holdings}
            walletAddress={walletAddress}
            onSendClick={() => switchPanel("send")}
            onReceiveClick={() => switchPanel("receive")}
            onSwapClick={() => switchPanel("swap")}
          />

          <QuickStats
            holdings={holdings}
            totalUsd={totalUsd}
            change24hUsd={change24hUsd}
          />

          {activePanel && (
            <div ref={panelRef} className="mt-4">
              <div className="rounded-xl border border-border bg-background overflow-hidden">
                {activePanel === "send" && (
                  <SendInterface
                    holdings={holdings}
                    onBack={closePanel}
                    activePanel={activePanel}
                    onSwitchPanel={switchPanel}
                  />
                )}
                {activePanel === "receive" && (
                  <ReceiveInterface
                    holdings={holdings}
                    onBack={closePanel}
                    activePanel={activePanel}
                    onSwitchPanel={switchPanel}
                  />
                )}
                {activePanel === "swap" && (
                  <SwapInterface
                    holdings={holdings}
                    onBack={closePanel}
                    activePanel={activePanel}
                    onSwitchPanel={switchPanel}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
