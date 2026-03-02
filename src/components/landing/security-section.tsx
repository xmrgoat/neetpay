"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Lock, EyeOff, ShieldCheck, KeyRound } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const SECURITY_POINTS = [
  {
    icon: EyeOff,
    title: "Zero KYC",
    description:
      "Email sign-up only. We never ask for your identity. Your customers stay anonymous too.",
  },
  {
    icon: Lock,
    title: "Cryptographic webhooks",
    description:
      "Every callback is HMAC-SHA512 signed. Verify it yourself, trust nothing.",
  },
  {
    icon: KeyRound,
    title: "Keys never leave your backend",
    description:
      "API keys are server-side only. No client-side exposure, no browser leaks.",
  },
  {
    icon: ShieldCheck,
    title: "Non-custodial by design",
    description:
      "We generate addresses from your public key. We never hold a private key, never touch your funds.",
  },
];

export function SecuritySection() {
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
        sectionRef.current.querySelector("[data-sec-header]"),
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }
      );

      /* HMAC card */
      tl.fromTo(
        sectionRef.current.querySelector("[data-sec-sig]"),
        { opacity: 0, y: 20, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power2.out" },
        0.2
      );

      /* Security cards stagger */
      tl.fromTo(
        sectionRef.current.querySelectorAll("[data-sec-item]"),
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "back.out(1.2)",
          stagger: 0.1,
        },
        0.3
      );
    },
    { scope: sectionRef, revertOnUpdate: true }
  );

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 overflow-hidden"
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, rgba(255,102,0,0.03), transparent 70%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-6">
        {/* ── Header — centered ── */}
        <div data-sec-header className="text-center mb-12">
          <p className="text-[11px] font-medium text-primary uppercase tracking-widest mb-4">
            Security
          </p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl leading-[1.1]">
            No one can freeze your payments.
            <br />
            <span className="text-muted">
              No one can reject your business type.
            </span>
          </h2>
          <p className="mt-5 text-lg text-foreground-secondary leading-relaxed max-w-lg mx-auto">
            No email. No name. No address. A wallet sends money. You receive it.
            That&apos;s the transaction.
          </p>
        </div>

        {/* ── HMAC signature — dark glass card, centered ── */}
        <div data-sec-sig className="flex justify-center mb-14">
          <div
            className="glass rounded-xl px-5 py-3.5 max-w-md w-full"
            style={{
              background: "rgba(12, 12, 16, 0.55)",
              backdropFilter: "blur(20px) saturate(1.4)",
              WebkitBackdropFilter: "blur(20px) saturate(1.4)",
            }}
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#28c840]/70 animate-pulse-subtle" />
              <span className="text-[10px] font-mono text-muted uppercase tracking-wider">
                Webhook signature verified
              </span>
            </div>
            <p className="font-mono text-[11px] text-foreground-secondary/60 leading-relaxed">
              <span className="text-muted">sig:</span> HMAC-SHA512(
              <span className="text-primary/50">sk_live_****</span>, payload
              <span className="text-muted">)</span> ={" "}
              <span className="text-foreground-secondary/40">
                4a8f3c91...e7b2
              </span>
            </p>
          </div>
        </div>

        {/* ── Security cards — 2x2 glass grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SECURITY_POINTS.map((point) => (
            <div
              key={point.title}
              data-sec-item
              className="glass rounded-2xl p-6 group transition-transform hover:-translate-y-0.5 duration-300"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 border border-primary/10 mb-4 transition-colors group-hover:bg-primary/10 group-hover:border-primary/20">
                <point.icon
                  size={18}
                  className="text-primary/60 transition-colors group-hover:text-primary/80"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="font-heading text-base font-semibold mb-2">
                {point.title}
              </h3>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
