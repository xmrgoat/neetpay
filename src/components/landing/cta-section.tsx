"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

export function CtaSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current) return;

      gsap.fromTo(
        "[data-cta-card]",
        { opacity: 0, y: 48, scale: 0.97 },
        {
          opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 80%", toggleActions: "play none none none" },
        }
      );

      ["[data-cta-heading]", "[data-cta-sub]", "[data-cta-btn]", "[data-cta-trust]", "[data-cta-terminal]"].forEach((sel, i) => {
        gsap.fromTo(sel, { opacity: 0, y: 20 }, {
          opacity: 1, y: 0, duration: 0.6, ease: "power3.out", delay: 0.15 + i * 0.1,
          scrollTrigger: { trigger: sectionRef.current, start: "top 80%", toggleActions: "play none none none" },
        });
      });
    },
    { scope: sectionRef, revertOnUpdate: true }
  );

  return (
    <section ref={sectionRef} className="relative py-32 sm:py-40 overflow-hidden">
      {/* Ambient blobs */}
      <div
        className="pointer-events-none absolute bottom-0 left-1/4 h-[480px] w-[480px] -translate-x-1/2 translate-y-1/4 rounded-full animate-aurora-drift"
        style={{ background: "radial-gradient(ellipse at center, rgba(255,102,0,0.07) 0%, transparent 65%)", filter: "blur(40px)" }}
      />
      <div
        className="pointer-events-none absolute top-0 right-1/4 h-[400px] w-[400px] translate-x-1/3 -translate-y-1/4 rounded-full animate-aurora-drift-2"
        style={{ background: "radial-gradient(ellipse at center, rgba(255,102,0,0.05) 0%, transparent 65%)", filter: "blur(48px)" }}
      />

      {/* Glass card */}
      <div className="relative mx-auto max-w-2xl px-6">
        <div
          data-cta-card
          className="relative rounded-3xl px-8 py-12 sm:px-14 sm:py-16 text-center overflow-hidden"
          style={{
            background: "rgba(12, 14, 18, 0.72)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            border: "1px solid rgba(255, 255, 255, 0.07)",
            boxShadow: "0 0 0 1px rgba(255,102,0,0.04) inset, 0 40px 80px rgba(0,0,0,0.35), 0 0 60px rgba(255,102,0,0.04)",
          }}
        >
          {/* Top edge highlight */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-3xl"
            style={{ background: "linear-gradient(to right, transparent 10%, rgba(255,255,255,0.10) 50%, transparent 90%)" }}
          />

          {/* Orange rule */}
          <div
            className="mx-auto mb-10 h-px w-10"
            style={{ background: "linear-gradient(to right, transparent, rgba(255,102,0,0.5), transparent)" }}
          />

          <h2
            data-cta-heading
            className="font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl leading-[1.05]"
          >
            Own your payments.
            <br />
            <span className="text-primary">Pay without permission.</span>
          </h2>

          <p data-cta-sub className="mt-5 text-base text-[#9d9da8] leading-relaxed max-w-sm mx-auto">
            Free tier. Email only. No KYC, no custody, no middlemen. Your wallet, your rules.
          </p>

          <div data-cta-btn className="mt-9 flex items-center justify-center">
            <Link href="/login" className="btn-rainbow rounded-full cursor-pointer">
              <div className="btn-rainbow-inner flex items-center justify-center h-14 px-10 rounded-full">
                <span className="font-semibold text-lg">Create your account</span>
                <ArrowRight className="w-5 h-5 ml-2 text-black" />
              </div>
            </Link>
          </div>

          {/* Trust anchors */}
          <div data-cta-trust className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-[#666]">
            <span><span className="text-[#bbb] font-medium">0%</span> transaction fees</span>
            <span className="hidden sm:block h-3 w-px bg-[#333]" />
            <span><span className="text-[#bbb] font-medium">No KYC</span> required</span>
            <span className="hidden sm:block h-3 w-px bg-[#333]" />
            <span><span className="text-[#bbb] font-medium">18+</span> cryptocurrencies</span>
            <span className="hidden sm:block h-3 w-px bg-[#333]" />
            <span className="text-[#bbb] font-medium">Non-custodial</span>
          </div>

          {/* Terminal snippet */}
          <div
            data-cta-terminal
            className="mt-9 mx-auto max-w-xs rounded-lg border border-dashed px-4 py-3"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <p className="font-mono text-[11px] text-[#444] text-left leading-relaxed">
              <span className="text-[#555]">$</span>{" "}
              <span className="text-[#ff6600]/60">curl</span>{" "}
              <span className="text-[#888]">-X POST</span>{" "}
              <span className="text-[#ff6600]/50">api.neetpay.com/v1/payment</span>
              <br />
              <span className="text-[#333]">&nbsp;&nbsp;→ payment_url in 80ms</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
