"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "general", label: "General" },
  { key: "security", label: "Security" },
  { key: "billing", label: "Billing" },
] as const;

interface SettingsTabsProps {
  activeTab: string;
}

export function SettingsTabs({ activeTab }: SettingsTabsProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      // Animate the sibling tab content container (next element after tabs)
      const tabContent = containerRef.current.nextElementSibling;
      if (!tabContent) return;

      gsap.fromTo(
        tabContent,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
      );
    },
    { scope: containerRef, dependencies: [activeTab] }
  );

  function handleTabClick(tab: string) {
    const params = tab === "general" ? "" : `?tab=${tab}`;
    router.push(`/dashboard/settings${params}`);
  }

  return (
    <div ref={containerRef} className="border-b border-border">
      <nav className="-mb-px flex gap-0" aria-label="Settings tabs">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
