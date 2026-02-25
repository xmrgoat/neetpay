"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Terminal } from "lucide-react";
import Link from "next/link";

const TERMINAL_LINES = [
  {
    text: '$ curl -X POST https://api.neetpay.com/v1/payment \\',
    type: "command" as const,
  },
  {
    text: '  -H "Authorization: Bearer np_live_..." \\',
    type: "command" as const,
  },
  {
    text: '  -d \'{"amount": 29.99, "currency": "USD"}\'',
    type: "command" as const,
  },
  { text: "", type: "empty" as const },
  { text: "{", type: "response" as const },
  {
    text: '  "track_id": "np_7x9k2mf3a8...",',
    type: "response" as const,
  },
  {
    text: '  "status": "waiting",',
    type: "status" as const,
    statusColor: "text-warning",
  },
  {
    text: '  "address": "47sghzufGhJk8nPQ...",',
    type: "response" as const,
  },
  {
    text: '  "amount_crypto": "0.1847 XMR"',
    type: "response" as const,
  },
  { text: "}", type: "response" as const },
  { text: "", type: "empty" as const },
  {
    text: '  "status": "paid"',
    type: "status" as const,
    statusColor: "text-success",
  },
  {
    text: "  tx: 4a8f3c91...e7b2d04e",
    type: "hash" as const,
  },
];

function TerminalLine({
  line,
  index,
}: {
  line: (typeof TERMINAL_LINES)[number];
  index: number;
}) {
  if (line.type === "empty") {
    return <div data-terminal-line className="h-5 opacity-0" />;
  }

  const colorClass = (() => {
    switch (line.type) {
      case "command":
        return "text-[#f5f5f5]";
      case "response":
        return "text-[#a3a3a3]";
      case "status":
        return line.statusColor || "text-[#a3a3a3]";
      case "hash":
        return "text-primary";
      default:
        return "text-[#a3a3a3]";
    }
  })();

  return (
    <div data-terminal-line className={`${colorClass} opacity-0`}>
      {line.text}
    </div>
  );
}

export function TerminalHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const tl = gsap.timeline({ delay: 0.3 });

      // 1. Terminal window fade in
      tl.from("[data-terminal-window]", {
        opacity: 0,
        y: 20,
        duration: 0.5,
        ease: "power3.out",
      });

      // 2. Terminal lines appear sequentially
      const lines =
        containerRef.current.querySelectorAll("[data-terminal-line]");
      lines.forEach((line, i) => {
        const delay = i < 3 ? 0.06 : i === 3 ? 0.3 : 0.04;
        tl.to(
          line,
          {
            opacity: 1,
            duration: 0.03,
          },
          `>+${delay}`
        );
      });

      // 3. Headline word reveal
      const words =
        containerRef.current.querySelectorAll("[data-reveal-word]");
      tl.from(
        words,
        {
          y: "110%",
          duration: 0.8,
          stagger: 0.08,
          ease: "power3.out",
        },
        "-=0.4"
      );

      // 4. Subtext
      tl.from(
        "[data-hero-sub]",
        {
          y: 20,
          opacity: 0,
          duration: 0.6,
          ease: "power3.out",
        },
        "-=0.3"
      );

      // 5. CTAs
      tl.from(
        "[data-hero-ctas]",
        {
          y: 20,
          opacity: 0,
          duration: 0.5,
          ease: "power3.out",
        },
        "-=0.2"
      );
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen bg-[#0a0a0a] text-[#f5f5f5] overflow-hidden"
    >
      {/* Subtle dot grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center gap-16 px-6 pt-16 lg:flex-row lg:gap-20">
        {/* Terminal */}
        <div className="w-full max-w-xl lg:w-1/2" data-terminal-window>
          <div className="rounded-xl border border-[#262626] bg-[#141414] overflow-hidden">
            {/* Terminal header */}
            <div className="flex items-center gap-2 border-b border-[#262626] px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-[#262626]" />
                <div className="h-3 w-3 rounded-full bg-[#262626]" />
                <div className="h-3 w-3 rounded-full bg-[#262626]" />
              </div>
              <div className="flex items-center gap-1.5 ml-3">
                <Terminal size={12} className="text-[#525252]" />
                <span className="text-[11px] font-mono text-[#525252]">
                  terminal
                </span>
              </div>
            </div>

            {/* Terminal body */}
            <div
              ref={terminalRef}
              className="p-5 font-mono text-[13px] leading-6 space-y-0"
            >
              {TERMINAL_LINES.map((line, i) => (
                <TerminalLine key={i} line={line} index={i} />
              ))}
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left">
          <div ref={headlineRef} className="mb-6">
            <h1 className="font-heading text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              {"Pay without".split(" ").map((word, i) => (
                <span key={i} className="inline-block overflow-hidden mr-[0.3em]">
                  <span data-reveal-word className="inline-block">
                    {word}
                  </span>
                </span>
              ))}
              <br />
              <span className="inline-block overflow-hidden">
                <span data-reveal-word className="inline-block text-primary">
                  permission.
                </span>
              </span>
            </h1>
          </div>

          <p
            data-hero-sub
            className="max-w-md text-lg text-[#a3a3a3] leading-relaxed mb-8"
          >
            Crypto payment gateway. Accept XMR, BTC, ETH and more.
            No KYC. No custody. No compromises.
          </p>

          <div data-hero-ctas className="flex items-center gap-4">
            <Link href="/register">
              <Button size="lg">
                Get Started
                <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/docs">
              <Button
                variant="ghost"
                size="lg"
                className="text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#1c1c1c]"
              >
                Read the docs
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
