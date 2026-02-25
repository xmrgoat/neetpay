"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export function useTextReveal<T extends HTMLElement>(
  options?: {
    delay?: number;
    stagger?: number;
    duration?: number;
  }
) {
  const ref = useRef<T>(null);
  const { delay = 0, stagger = 0.08, duration = 0.8 } = options ?? {};

  useGSAP(
    () => {
      if (!ref.current) return;

      const lines = ref.current.querySelectorAll("[data-reveal-line]");
      if (!lines.length) return;

      gsap.from(lines, {
        y: "110%",
        duration,
        stagger,
        ease: "power3.out",
        delay,
      });
    },
    { scope: ref }
  );

  return ref;
}
