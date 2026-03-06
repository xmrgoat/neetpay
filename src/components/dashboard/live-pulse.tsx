"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Zap, Globe, Shield } from "lucide-react";

interface Props {
  pendingCount: number;
  confirmingCount: number;
  lastPaymentAge?: string; // e.g., "2m ago"
}

export function LivePulse({ pendingCount, confirmingCount, lastPaymentAge }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      gsap.fromTo(
        ref.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power2.out" },
      );
    },
    { scope: ref },
  );

  const isActive = pendingCount > 0 || confirmingCount > 0;

  return (
    <div
      ref={ref}
      className="flex items-center gap-4 px-1 py-2"
    >
      {/* Live indicator */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex h-2 w-2">
          {isActive && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          )}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${isActive ? "bg-success" : "bg-muted/40"}`} />
        </div>
        <span className="text-[10px] font-medium text-muted uppercase tracking-wider">
          {isActive ? "Live" : "Idle"}
        </span>
      </div>

      {/* Status chips */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-warning">
          <Zap className="h-2.5 w-2.5" />
          <span className="tabular-nums font-medium">{pendingCount} pending</span>
        </div>
      )}
      {confirmingCount > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-primary">
          <Globe className="h-2.5 w-2.5" />
          <span className="tabular-nums font-medium">{confirmingCount} confirming</span>
        </div>
      )}
      {lastPaymentAge && (
        <div className="flex items-center gap-1 text-[10px] text-muted ml-auto">
          <Shield className="h-2.5 w-2.5" />
          <span>Last tx {lastPaymentAge}</span>
        </div>
      )}
    </div>
  );
}
