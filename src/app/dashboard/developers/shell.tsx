"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface DevelopersShellProps {
  children: ReactNode;
}

export function DevelopersShell({ children }: DevelopersShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const sections = containerRef.current.querySelectorAll("[data-animate]");
      if (!sections.length) return;

      gsap.from(sections, {
        y: 24,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power3.out",
      });
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="space-y-8">
      {children}
    </div>
  );
}
