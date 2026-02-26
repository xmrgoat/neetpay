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
  { text: 'const payment = await fetch(', color: "text-[#ccc]" },
  { text: '  "https://api.neetpay.com/v1/payment",', color: "text-[#ff6600]/70" },
  { text: '  {', color: "text-[#666]" },
  { text: '    method: "POST",', color: "text-[#999]" },
  { text: '    headers: {', color: "text-[#999]" },
  { text: '      "Authorization": "Bearer np_live_..."', color: "text-[#999]" },
  { text: '    },', color: "text-[#666]" },
  { text: '    body: JSON.stringify({', color: "text-[#999]" },
  { text: '      amount: 29.99,', color: "text-[#ff6600]/70" },
  { text: '      currency: "USD"', color: "text-[#ff6600]/70" },
  { text: '    })', color: "text-[#666]" },
  { text: '  }', color: "text-[#666]" },
  { text: ');', color: "text-[#666]" },
  { text: '', color: "" },
  { text: 'const { payment_url } = await payment.json();', color: "text-[#ccc]" },
  { text: '// Redirect customer to payment_url', color: "text-[#444]" },
];

export function DeveloperSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current) return;

      ["[data-dev-text]", "[data-dev-code]"].forEach((sel) => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sel,
            start: "top 90%",
            end: "top -10%",
            scrub: 2,
          },
        });
        tl.fromTo(sel,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.4 }
        );
        tl.to(sel,
          { opacity: 0, duration: 0.4 }, 0.6
        );
      });
    },
    { scope: sectionRef, revertOnUpdate: true }
  );

  return (
    <section id="developers" ref={sectionRef} className="py-24 sm:py-32 border-t border-border">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Text */}
          <div data-dev-text>
            <p className="text-[11px] font-medium text-primary uppercase tracking-widest mb-4">
              Developers
            </p>
            <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl leading-[1.1]">
              Ship in minutes,
              <br />
              <span className="text-muted">not weeks.</span>
            </h2>
            <p className="mt-6 text-lg text-foreground-secondary leading-relaxed max-w-md">
              One POST request. Three required fields. One webhook event.
              No SDKs to install, no libraries to learn, no OAuth dance.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-start gap-3">
              <Link href="/register">
                <Button size="lg" className="h-12 px-6 text-base font-semibold">
                  Get your API key
                  <ArrowRight size={16} />
                </Button>
              </Link>
              <Link href="/docs">
                <Button
                  variant="secondary"
                  size="lg"
                  className="h-12 px-6"
                >
                  View API reference
                </Button>
              </Link>
            </div>
          </div>

          {/* Code block — always dark (product preview) */}
          <div data-dev-code className="rounded-2xl border border-[#1e1e24] bg-[#0c0c10] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[#1e1e24] px-4 py-3">
              <Terminal size={12} className="text-[#555]" />
              <span className="text-[11px] font-mono text-[#555]">checkout.ts</span>
            </div>
            <div className="p-5 font-mono text-[12px] leading-6 overflow-x-auto">
              {CODE_LINES.map((line, i) => (
                <div key={i} className={line.color || "h-5"}>
                  {line.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
