"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1,
  className,
}: AnimatedCounterProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const counterRef = useRef({ val: 0 });

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    gsap.to(counterRef.current, {
      val: value,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        const formatted = counterRef.current.val.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
        el.textContent = `${prefix}${formatted}${suffix}`;
      },
    });
  }, [value, prefix, suffix, decimals, duration]);

  return (
    <span ref={spanRef} className={className}>
      {prefix}0{suffix}
    </span>
  );
}
