"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CrystalScene } from "./crystal-scene";

gsap.registerPlugin(ScrollTrigger);

/* ─── Monochrome crypto symbol SVGs (outline / glyph style) ─── */

const ICONS: { id: string; name: string; path: string }[] = [
  { id: "btc",  name: "Bitcoin",   path: "M14.5 4v1.5c-2.5.5-4 2-4 4 0 1.5.8 2.5 2.5 3.2l1.5.6v4.2c-1.2-.2-1.8-.9-2-1.8l-2.5.5c.4 2 2 3.2 4.5 3.6V22h2v-2.2c2.7-.4 4.2-2 4.2-4.1 0-1.7-.9-2.8-2.8-3.5l-1.4-.5V7.7c.9.2 1.4.7 1.6 1.5l2.4-.4c-.4-1.8-1.8-2.9-4-3.3V4h-2zm0 5.2V7.7c.8.1 1.3.5 1.3 1.2 0 .6-.4 1-1.3 1.3zm2 4.1c1 .4 1.4.8 1.4 1.5 0 .8-.5 1.3-1.4 1.5v-3z" },
  { id: "eth",  name: "Ethereum",  path: "M12 3l-8 13 8-3.5V3zm0 0l8 13-8-3.5V3zm0 18.5v5.5l8-11.5-8 6zm0 5.5v-5.5l-8-6 8 11.5z" },
  { id: "xmr",  name: "Monero",    path: "M12 4L4 12v7h4v-5l4-4 4 4v5h4v-7L12 4z" },
  { id: "sol",  name: "Solana",    path: "M5 17l2-2h10l-2 2H5zm0-7l2 2h10l-2-2H5zm0 3.5h12l-2 2H7l-2-2z" },
  { id: "usdt", name: "USDT",      path: "M13.5 13.8v-2h4V9H6.5v2.8h4v2c-3 .2-5.2.9-5.2 1.8s2.2 1.6 5.2 1.8v5h3v-5c3-.2 5.2-.9 5.2-1.8s-2.2-1.6-5.2-1.8z" },
  { id: "usdc", name: "USDC",      path: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 3c1.7 0 2.5.8 2.8 1.8l-1.6.4c-.2-.5-.5-.7-1.2-.7-.8 0-1.2.4-1.2.9 0 .6.3.8 1.5 1.1 1.8.4 2.7 1 2.7 2.5 0 1.3-.9 2.2-2.2 2.4v1h-1.6v-1c-1.3-.2-2.1-1-2.3-2.2l1.7-.3c.1.7.5 1 1.4 1 .9 0 1.3-.4 1.3-1 0-.6-.3-.9-1.5-1.2-1.8-.4-2.7-1-2.7-2.4 0-1.2.8-2 2-2.3V5h1.6v1z" },
  { id: "trx",  name: "Tron",      path: "M4 5l14 2-6 16L4 5zm3 2l5.5 13 4-11L7 7z" },
  { id: "bnb",  name: "BNB",       path: "M8.1 10.4L12 6.5l3.9 3.9 2.1-2.1L12 2.2 5.8 8.4l2.3 2zm-4 3.6l2-2 2 2-2 2-2-2zm4 3.6L12 21.5l3.9-3.9 2.1 2.1L12 25.8 5.8 19.6l2.3-2zm7.9-3.6l2-2 2 2-2 2-2-2zM14.2 14L12 11.8 9.8 14 12 16.2 14.2 14z" },
  { id: "ltc",  name: "Litecoin",  path: "M12 4l-1 8-3 1.5.5-1.5 3-8h-3L6 16H4.5L4 18h2l-.5 2H20l.5-2h-8l1.5-4 3-1-.5 1L12 4z" },
  { id: "doge", name: "Dogecoin",  path: "M9 6h5c4 0 6 2.5 6 6s-2 6-6 6H9V6zm3 2.5v7h2c2 0 3.5-1.5 3.5-3.5S16 8.5 14 8.5h-2zM7 11h6v2H7z" },
  { id: "ton",  name: "Toncoin",   path: "M6 6h12l-6 16L6 6zm2 1.5L12 18l4-10.5H8z" },
  { id: "xrp",  name: "XRP",       path: "M6 4h2.4L12 9l3.6-5H18l-6 8 6 8h-2.4L12 15l-3.6 5H6l6-8-6-8z" },
  { id: "avax", name: "Avalanche", path: "M17 18h-2.5c-.4 0-.7-.2-.9-.5L12 14.2l-1.6 3.3c-.2.3-.5.5-.9.5H7l5-10.5L17 18z" },
  { id: "arb",  name: "Arbitrum",  path: "M12 3l8 10-8 10-8-10 8-10zm0 3L7.5 13 12 20l4.5-7L12 6z" },
  { id: "op",   name: "Optimism",  path: "M9 17c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM16 16.5V9h2v3h2c1.4 0 2.5 1 2.5 2.2s-1.1 2.3-2.5 2.3H16z" },
  { id: "dash", name: "Dash",      path: "M7 8h8l-1 3H7L5 16h8l-1 3H4l3-11zm4 0h8l-3 11h-3l2-8H9l1-3z" },
  { id: "dot",  name: "Polkadot",  path: "M12 4a3 3 0 100 6 3 3 0 000-6zm0 14a3 3 0 100 6 3 3 0 000-6zm-5-7a3 3 0 100 6 3 3 0 000-6zm10 0a3 3 0 100 6 3 3 0 000-6z" },
  { id: "atom", name: "Cosmos",    path: "M12 10a2 2 0 110 4 2 2 0 010-4zm-6.9 6c.5 1.5 3.2 1.5 6.9-1 3.7 2.5 6.4 2.5 6.9 1s-1.6-3.5-5.2-5c3.6-1.5 5.7-3.5 5.2-5s-3.2-1.5-6.9 1C8.3 3.5 5.6 3.5 5.1 5s1.6 3.5 5.2 5c-3.6 1.5-5.7 3.5-5.2 5z" },
  { id: "link", name: "Chainlink", path: "M12 2l3 5.5-3 1.5-3-1.5L12 2zm-5 9l3-1.5 2 3.5-3 5-5-2 3-5zm10 0l-3-1.5-2 3.5 3 5 5-2-3-5z" },
  { id: "ada",  name: "Cardano",   path: "M12 3l1.5 4H18l-3.5 3 1.5 4L12 11l-4 3 1.5-4L6 7h4.5L12 3z" },
];

/* Build row sets — shuffle slightly for visual variety */
const ROW_1 = [...ICONS.slice(0, 10), ...ICONS.slice(10, 20)];
const ROW_2 = [...ICONS.slice(10, 20), ...ICONS.slice(0, 10)];

/* ─── Single icon in rounded square card with hover ────── */
function CryptoGlyph({ icon }: { icon: (typeof ICONS)[number] }) {
  return (
    <div className="relative shrink-0 mx-2 sm:mx-2.5 select-none group/card">
      <div
        className="flex items-center justify-center rounded-xl border border-white/[0.08] transition-all duration-200 group-hover/card:scale-110 group-hover/card:border-white/20"
        style={{
          width: 52,
          height: 52,
          background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.1)",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 sm:h-6 sm:w-6 transition-opacity duration-200 opacity-30 group-hover/card:opacity-70"
        >
          <path d={icon.path} fill="white" />
        </svg>
      </div>
      {/* Tooltip — crypto name */}
      <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover/card:opacity-100 transition-opacity duration-150 pointer-events-none">
        <span className="whitespace-nowrap rounded-md bg-white/10 backdrop-blur-sm border border-white/10 px-2 py-0.5 text-[9px] font-medium text-white/70">
          {icon.name}
        </span>
      </div>
    </div>
  );
}

/* ─── Marquee row (monochrome icons) ──────────────────── */
function IconMarquee({
  icons,
  reverse = false,
  speed = 30,
}: {
  icons: (typeof ICONS);
  reverse?: boolean;
  speed?: number;
}) {
  const duped = [...icons, ...icons, ...icons, ...icons];

  return (
    <div
      className="relative overflow-x-clip overflow-y-visible group/marquee pt-3 pb-8"
      style={{
        maskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
      }}
    >
      <div
        className="flex items-center w-max group-hover/marquee:[animation-play-state:paused]"
        style={{
          animation: `${reverse ? "marquee-reverse" : "marquee"} ${speed}s linear infinite`,
        }}
      >
        {duped.map((icon, i) => (
          <CryptoGlyph key={`${icon.id}-${i}`} icon={icon} />
        ))}
      </div>
    </div>
  );
}

/* ─── Main section ────────────────────────────────────── */
export function CryptoUniverse() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current) return;

      const els = sectionRef.current.querySelectorAll("[data-cu-animate]");
      els.forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              toggleActions: "play none none none",
            },
          },
        );
      });
    },
    { scope: sectionRef, revertOnUpdate: true },
  );

  return (
    <section ref={sectionRef} className="relative pt-48 sm:pt-60 pb-24 sm:pb-32 overflow-hidden">
      {/* Radial orange glow — centered on the 3D model */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[40%] w-[700px] h-[700px] sm:w-[1000px] sm:h-[1000px]"
        style={{
          background: "radial-gradient(circle, rgba(255,102,0,0.10) 0%, rgba(255,102,0,0.04) 30%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Label */}
        <p
          data-cu-animate
          className="text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-[#ff6600] mb-5"
        >
          15+ Cryptocurrencies
        </p>

        {/* Heading */}
        <h2
          data-cu-animate
          className="text-center font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl mb-20 sm:mb-24"
        >
          Entire Crypto Universe
        </h2>

        {/* ── Icon rows + 3D model stacked together ── */}
        <div data-cu-animate className="relative">
          {/* Row 1 — goes behind the 3D model */}
          <div className="relative z-0">
            <IconMarquee icons={ROW_1} speed={50} />
          </div>

          {/* Row 2 — goes behind the 3D model */}
          <div className="relative z-0 -mt-4 sm:-mt-3">
            <IconMarquee icons={ROW_2} reverse speed={40} />
          </div>

          {/* 3D Logo — absolutely centered ON TOP of both rows */}
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="relative h-[260px] w-[260px] sm:h-[340px] sm:w-[340px] lg:h-[400px] lg:w-[400px]">
              {/* Glow behind model */}
              <div
                className="absolute inset-[-35%] rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(255,102,0,0.18) 0%, rgba(255,102,0,0.06) 35%, transparent 65%)",
                }}
              />
              {/* Dark fade to hide icons behind the model */}
              <div
                className="absolute inset-[-20%] rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(8,8,12,0.9) 0%, rgba(8,8,12,0.5) 35%, transparent 60%)",
                }}
              />
              {/* Only the crystal canvas gets pointer events */}
              <div className="relative h-full w-full pointer-events-auto" style={{ borderRadius: "50%", overflow: "hidden" }}>
                <CrystalScene className="h-full w-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom description */}
        <p
          data-cu-animate
          className="mx-auto mt-24 sm:mt-32 max-w-xl text-center text-sm text-white/40 leading-relaxed"
        >
          Experience a comprehensive selection of cryptocurrencies available
          on our platform. Manage your payments with confidence and
          settle directly to your wallet with zero fees.
        </p>
      </div>
    </section>
  );
}
