"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

/* ── Types ── */
interface TerminalLine {
  prompt: string;
  text: string;
  accent?: boolean;
  dim?: boolean;
}

interface Step {
  number: string;
  title: string;
  description: string;
  lines: TerminalLine[];
}

/* ── Data ── */
const STEPS: Step[] = [
  {
    number: "01",
    title: "Create an account",
    description:
      "Email only. No KYC, no identity checks, no waiting. Your API key is ready in seconds.",
    lines: [
      { prompt: "$", text: "neetpay signup --email you@pm.me" },
      { prompt: "\u2192", text: "api_key: sk_live_****e7b2", accent: true },
      { prompt: "\u2713", text: "ready in 4 seconds", accent: true },
    ],
  },
  {
    number: "02",
    title: "Share a link or embed checkout",
    description:
      "Drop a payment link anywhere \u2014 or add our checkout widget. Customer picks a coin and pays directly.",
    lines: [
      { prompt: "", text: "pay.neetpay.com/inv/a1b2c3" },
      { prompt: "", text: "BTC \u00b7 ETH \u00b7 XMR \u00b7 SOL \u00b7 +14", dim: true },
      { prompt: "$", text: "250.00 \u2014 awaiting payment", accent: true },
    ],
  },
  {
    number: "03",
    title: "Get paid in crypto",
    description:
      "Funds settle to your wallet. Addresses derived from your extended public key \u2014 we never hold a private key.",
    lines: [
      { prompt: "\u2190", text: "0.0041 BTC received", accent: true },
      { prompt: "\u2190", text: "1.82 XMR confirmed", accent: true },
      { prompt: "\u03a3", text: "$4,201.00 total settled" },
    ],
  },
];

/* SVG circle circumference for r=28: 2\u03c0 \u00d7 28 \u2248 175.93 */
const RING_C = 175.93;

/* ── Component ── */
export function HowItWorks() {
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

      /* Cards stagger in */
      tl.fromTo(
        sectionRef.current.querySelectorAll("[data-step-card]"),
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "back.out(1.4)",
          stagger: 0.18,
        }
      );

      /* SVG rings draw */
      tl.to(
        sectionRef.current.querySelectorAll("[data-ring]"),
        {
          strokeDashoffset: 0,
          duration: 1.2,
          ease: "power2.out",
          stagger: 0.18,
        },
        0.15
      );

      /* Beam segments scale in from center */
      tl.fromTo(
        sectionRef.current.querySelectorAll("[data-beam-seg]"),
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.6,
          ease: "power2.out",
          stagger: 0.08,
        },
        0.3
      );

      /* Terminal lines per card */
      sectionRef.current
        .querySelectorAll("[data-step-card]")
        .forEach((card, i) => {
          const lines = card.querySelectorAll("[data-line]");
          tl.fromTo(
            lines,
            { opacity: 0, x: -6 },
            { opacity: 1, x: 0, duration: 0.35, stagger: 0.06 },
            0.5 + i * 0.18
          );
        });
    },
    { scope: sectionRef, revertOnUpdate: true }
  );

  return (
    <section
      id="how-it-works"
      className="relative py-24 sm:py-32 overflow-hidden"
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, rgba(255,102,0,0.035), transparent 70%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        {/* ── Header ── */}
        <div className="text-center mb-16 sm:mb-20">
          <p className="text-[11px] font-medium text-primary uppercase tracking-widest mb-4">
            How it works
          </p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Up and running in minutes
          </h2>
          <p className="mt-4 text-lg text-foreground-secondary max-w-lg mx-auto">
            Three steps to start accepting crypto. No meetings, no onboarding
            calls, no compliance reviews.
          </p>
        </div>

        {/* ── Steps grid ── */}
        <div
          ref={sectionRef}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {STEPS.map((step, i) => (
            <div
              key={step.number}
              data-step-card
              className="flex flex-col items-center"
            >
              {/* ── Desktop: progress node with connecting beams ── */}
              <div className="hidden lg:flex relative w-full items-center justify-center mb-6 h-16">
                {/* Left beam segment */}
                {i > 0 && (
                  <div
                    data-beam-seg
                    className="absolute top-1/2 right-1/2 -left-4 h-px -translate-y-1/2 origin-right"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(255,102,0,0.25))",
                    }}
                  />
                )}
                {/* Right beam segment */}
                {i < STEPS.length - 1 && (
                  <div
                    data-beam-seg
                    className="absolute top-1/2 left-1/2 -right-4 h-px -translate-y-1/2 origin-left"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(255,102,0,0.25), transparent)",
                    }}
                  />
                )}

                {/* Number orb */}
                <div className="relative z-10 group/orb">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 64 64"
                    className="absolute inset-0"
                  >
                    <circle
                      data-ring
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="1"
                      strokeDasharray={RING_C}
                      strokeDashoffset={RING_C}
                      strokeLinecap="round"
                      opacity="0.5"
                    />
                  </svg>
                  <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl scale-[2.5] opacity-0 group-hover/orb:opacity-100 transition-opacity duration-500" />
                  <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-primary/15 bg-primary/5 font-heading text-xl font-bold text-primary tabular-nums">
                    {step.number}
                  </span>
                </div>
              </div>

              {/* ── Glass card ── */}
              <div className="glass rounded-2xl p-6 sm:p-8 text-center w-full group transition-transform hover:-translate-y-1 duration-300">
                {/* Mobile: number badge */}
                <div className="lg:hidden flex justify-center mb-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/20 bg-primary/5 font-heading text-sm font-bold text-primary tabular-nums">
                    {step.number}
                  </span>
                </div>

                {/* Terminal snippet */}
                <div className="w-full rounded-xl border border-border/40 bg-[#08080c]/90 overflow-hidden mb-6">
                  {/* macOS chrome */}
                  <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-[#1a1a1f]/80">
                    <div className="w-[7px] h-[7px] rounded-full bg-[#ff5f57]/50" />
                    <div className="w-[7px] h-[7px] rounded-full bg-[#febc2e]/50" />
                    <div className="w-[7px] h-[7px] rounded-full bg-[#28c840]/50" />
                    <span className="ml-2 text-[10px] text-[#444] font-mono">
                      terminal
                    </span>
                  </div>
                  {/* Terminal lines */}
                  <div className="px-3.5 py-3 font-mono text-[11px] leading-[1.8] text-left space-y-px">
                    {step.lines.map((line, j) => (
                      <div key={j} data-line className="flex gap-1.5">
                        {line.prompt && (
                          <span
                            className={
                              line.accent ? "text-primary/60" : "text-[#555]"
                            }
                          >
                            {line.prompt}
                          </span>
                        )}
                        <span
                          className={
                            line.accent
                              ? "text-primary/80"
                              : line.dim
                                ? "text-[#555]"
                                : "text-[#999]"
                          }
                        >
                          {line.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Title & description */}
                <h3 className="font-heading text-lg font-semibold mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-foreground-secondary leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── CTA ── */}
        <div className="text-center mt-14">
          <Link href="/register">
            <Button size="lg" className="h-12 px-8 text-base font-semibold">
              Create your account — takes 30 seconds
              <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
