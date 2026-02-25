"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export function useCountUp<T extends HTMLElement = HTMLElement>(
  target: number,
  options?: {
    duration?: number;
    suffix?: string;
    prefix?: string;
    decimals?: number;
  }
) {
  const ref = useRef<T>(null);
  const {
    duration = 2,
    suffix = "",
    prefix = "",
    decimals = 0,
  } = options ?? {};
  const [display, setDisplay] = useState(
    prefix + "0" + suffix
  );

  useGSAP(
    () => {
      if (!ref.current) return;

      const proxy = { value: 0 };
      gsap.to(proxy, {
        value: target,
        duration,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
        onUpdate: () => {
          const formatted =
            decimals > 0
              ? proxy.value.toFixed(decimals)
              : Math.round(proxy.value).toLocaleString();
          setDisplay(prefix + formatted + suffix);
        },
      });
    },
    { scope: ref }
  );

  return { ref, display };
}
