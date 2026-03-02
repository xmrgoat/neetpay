"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Terminal } from "lucide-react";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

const CODE_LINES = [
  { text: "const payment = await fetch(", color: "text-[#ccc]" },
  {
    text: '  "https://api.neetpay.com/v1/payment",',
    color: "text-[#ff6600]/70",
  },
  { text: "  {", color: "text-[#666]" },
  { text: '    method: "POST",', color: "text-[#999]" },
  { text: "    headers: {", color: "text-[#999]" },
  {
    text: '      "Authorization": "Bearer np_live_..."',
    color: "text-[#999]",
  },
  { text: "    },", color: "text-[#666]" },
  { text: "    body: JSON.stringify({", color: "text-[#999]" },
  { text: "      amount: 29.99,", color: "text-[#ff6600]/70" },
  { text: '      currency: "USD"', color: "text-[#ff6600]/70" },
  { text: "    })", color: "text-[#666]" },
  { text: "  }", color: "text-[#666]" },
  { text: ");", color: "text-[#666]" },
  { text: "", color: "" },
  { text: "const { payment_url } = await payment.json();", color: "text-[#ccc]" },
  { text: "// Redirect customer to payment_url", color: "text-[#444]" },
];

export function DeveloperSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 78%",
          toggleActions: "play none none none",
        },
      });

      /* Header */
      tl.fromTo(
        sectionRef.current.querySelector("[data-dev-text]"),
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }
      );

      /* Code card */
      tl.fromTo(
        sectionRef.current.querySelector("[data-dev-code]"),
        { opacity: 0, y: 40, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "back.out(1.2)" },
        0.15
      );

      /* Code lines stagger */
      tl.fromTo(
        sectionRef.current.querySelectorAll("[data-code-line]"),
        { opacity: 0, x: -8 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.025 },
        0.4
      );

      /* Response strip */
      tl.fromTo(
        sectionRef.current.querySelector("[data-dev-response]"),
        { opacity: 0 },
        { opacity: 1, duration: 0.5 },
        0.7
      );

      /* CTAs */
      tl.fromTo(
        sectionRef.current.querySelector("[data-dev-cta]"),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
        0.6
      );
    },
    { scope: sectionRef, revertOnUpdate: true }
  );

  return (
    <section
      id="developers"
      ref={sectionRef}
      className="relative py-24 sm:py-32 overflow-hidden"
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, rgba(255,102,0,0.03), transparent 70%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-6">
        {/* ── Header — centered ── */}
        <div data-dev-text className="text-center mb-12">
          <p className="text-[11px] font-medium text-primary uppercase tracking-widest mb-4">
            Developers
          </p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl leading-[1.1]">
            Ship in minutes,{" "}
            <span className="text-muted">not weeks.</span>
          </h2>
          <p className="mt-5 text-lg text-foreground-secondary leading-relaxed max-w-lg mx-auto">
            One POST request. Three required fields. One webhook event. No SDKs
            to install, no libraries to learn, no OAuth dance.
          </p>
        </div>

        {/* ── Code card — dark glass ── */}
        <div
          data-dev-code
          className="glass rounded-2xl overflow-hidden"
          style={{
            background: "rgba(12, 12, 16, 0.65)",
            backdropFilter: "blur(20px) saturate(1.4)",
            WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          }}
        >
          {/* Chrome bar */}
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3.5">
            <div className="flex items-center gap-1.5">
              <div className="w-[7px] h-[7px] rounded-full bg-[#ff5f57]/50" />
              <div className="w-[7px] h-[7px] rounded-full bg-[#febc2e]/50" />
              <div className="w-[7px] h-[7px] rounded-full bg-[#28c840]/50" />
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-1.5">
                <Terminal size={11} className="text-[#555]" />
                <span className="text-[11px] font-mono text-[#555]">
                  checkout.ts
                </span>
              </div>
            </div>
            <div className="w-[39px]" />
          </div>

          {/* Code with line numbers */}
          <div className="p-5 sm:p-6 overflow-x-auto">
            <div className="font-mono text-[12px] sm:text-[13px] leading-6">
              {CODE_LINES.map((line, i) => (
                <div key={i} data-code-line className="flex">
                  <span className="w-8 shrink-0 text-right pr-4 text-[#333] select-none tabular-nums text-[11px]">
                    {i + 1}
                  </span>
                  <span className={line.color || "h-5"}>{line.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Response strip */}
          <div
            data-dev-response
            className="border-t border-white/[0.06] px-5 py-3 flex items-center gap-3 overflow-hidden"
          >
            <span className="text-[10px] font-mono text-[#555] uppercase tracking-wider shrink-0">
              Response
            </span>
            <span className="text-[11px] font-mono text-[#28c840]/70 shrink-0">
              200 OK
            </span>
            <span className="text-[11px] font-mono text-[#666] shrink-0">
              &middot;
            </span>
            <span className="text-[11px] font-mono text-[#555] truncate">
              {"{"} payment_url: &quot;https://pay.neetpay.com/...&quot; {"}"}
            </span>
            <span className="text-[11px] font-mono text-[#666] shrink-0 hidden sm:inline">
              &middot;
            </span>
            <span className="text-[11px] font-mono text-primary/50 shrink-0 hidden sm:inline">
              80ms
            </span>
          </div>
        </div>

        {/* ── CTAs — centered ── */}
        <div
          data-dev-cta
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10"
        >
          <Link href="/register">
            <Button size="lg" className="h-12 px-6 text-base font-semibold">
              Get your API key
              <ArrowRight size={16} />
            </Button>
          </Link>
          <Link href="/docs">
            <Button variant="secondary" size="lg" className="h-12 px-6">
              View API reference
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
