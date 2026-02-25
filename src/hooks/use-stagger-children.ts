"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export function useStaggerChildren<T extends HTMLElement>(
  selector: string,
  options?: {
    stagger?: number;
    y?: number;
    duration?: number;
  }
) {
  const ref = useRef<T>(null);
  const { stagger = 0.06, y = 30, duration = 0.7 } = options ?? {};

  useGSAP(
    () => {
      if (!ref.current) return;

      const children = ref.current.querySelectorAll(selector);
      if (!children.length) return;

      gsap.from(children, {
        y,
        opacity: 0,
        duration,
        stagger,
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
