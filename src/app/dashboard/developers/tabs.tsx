"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { Code, Blocks, Paintbrush } from "lucide-react";
import { cn } from "@/lib/utils";

interface DevelopersTabsProps {
  tabs: {
    api: ReactNode;
    widget: ReactNode;
    whitelabel: ReactNode;
  };
}

const TAB_CONFIG = [
  { key: "api", label: "API & Webhooks", icon: Code },
  { key: "widget", label: "Widget", icon: Blocks },
  { key: "whitelabel", label: "White-Label", icon: Paintbrush },
] as const;

type TabKey = (typeof TAB_CONFIG)[number]["key"];

export function DevelopersTabs({ tabs }: DevelopersTabsProps) {
  const [active, setActive] = useState<TabKey>("api");
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const btn = tabRefs.current.get(active);
    if (!btn || !tabsRef.current) return;

    const containerRect = tabsRef.current.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    setIndicatorStyle({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
    });
  }, [active]);

  return (
    <div>
      {/* Tab bar */}
      <div
        ref={tabsRef}
        className="relative flex items-center gap-1 rounded-lg border border-border bg-surface p-1"
      >
        {/* Sliding indicator */}
        <div
          className="absolute top-1 bottom-1 rounded-md bg-elevated border border-border transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />

        {TAB_CONFIG.map((tab) => {
          const isActive = active === tab.key;

          return (
            <button
              key={tab.key}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.key, el);
              }}
              onClick={() => setActive(tab.key)}
              className={cn(
                "relative z-10 flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium transition-colors duration-150",
                isActive
                  ? "text-foreground"
                  : "text-foreground-secondary hover:text-foreground",
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {active === "api" && tabs.api}
        {active === "widget" && tabs.widget}
        {active === "whitelabel" && tabs.whitelabel}
      </div>
    </div>
  );
}
