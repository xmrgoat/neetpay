"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const RANGES = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "1y", label: "1Y" },
  { key: "all", label: "All" },
] as const;

export function DateRangeSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeRange = searchParams.get("range") || "30d";

  const containerRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState<{
    left: number;
    width: number;
  } | null>(null);

  const updatePill = useCallback(() => {
    if (!containerRef.current) return;
    const activeButton = containerRef.current.querySelector<HTMLButtonElement>(
      `[data-range="${activeRange}"]`
    );
    if (!activeButton) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();

    setPillStyle({
      left: buttonRect.left - containerRect.left,
      width: buttonRect.width,
    });
  }, [activeRange]);

  useEffect(() => {
    updatePill();
  }, [updatePill]);

  const setRange = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key === "30d") {
        params.delete("range");
      } else {
        params.set("range", key);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams]
  );

  return (
    <div
      ref={containerRef}
      className="relative flex items-center bg-surface border border-border rounded-lg p-0.5"
    >
      {/* Sliding pill indicator */}
      {pillStyle && (
        <div
          className="absolute top-0.5 h-[calc(100%-4px)] rounded-md bg-elevated shadow-sm transition-all duration-150 ease-out pointer-events-none"
          style={{
            left: pillStyle.left,
            width: pillStyle.width,
          }}
        />
      )}

      {RANGES.map((range) => (
        <button
          key={range.key}
          data-range={range.key}
          onClick={() => setRange(range.key)}
          className={cn(
            "relative z-10 px-3 py-1 text-xs font-medium rounded-md cursor-pointer transition-colors duration-150",
            activeRange === range.key
              ? "text-foreground"
              : "text-muted hover:text-foreground-secondary"
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
