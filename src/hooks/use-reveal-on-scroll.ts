"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export function useRevealOnScroll<T extends HTMLElement>(
  options?: {
    y?: number;
    duration?: number;
    delay?: number;
  }
) {
  const ref = useRef<T>(null);
  const { y = 40, duration = 0.8, delay = 0 } = options ?? {};

  useGSAP(
    () => {
      if (!ref.current) return;

      gsap.from(ref.current, {
        y,
        opacity: 0,
        duration,
        delay,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    },
    { scope: ref }
  );

  return ref;
}
