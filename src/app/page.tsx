"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Menu, X, ArrowRight, Sun, Moon } from "lucide-react";
import { LiquidMetal } from "@paper-design/shaders-react";
import { CrystalScene } from "@/components/landing/crystal-scene";
import { NAV_LINKS } from "@/lib/constants";

export default function HomePage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const logoSectionRef = useRef<HTMLDivElement>(null);
  const mobileLogoRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);
  const [revealImg, setRevealImg] = useState<"light" | "dark" | null>(null);

  const isDark = mounted && resolvedTheme === "dark";

  const clickOrigin = useRef({ cx: 0, cy: 0, maxR: 0 });
  // Track which theme we're waiting to land on
  const pendingTheme = useRef<string | null>(null);

  const toggleTheme = useCallback(
    (e: React.MouseEvent) => {
      if (isAnimating.current) return;
      isAnimating.current = true;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const maxR = Math.hypot(
        Math.max(cx, window.innerWidth - cx),
        Math.max(cy, window.innerHeight - cy)
      );
      clickOrigin.current = { cx, cy, maxR };

      const incoming = isDark ? "light" : "dark";
      pendingTheme.current = incoming;
      setRevealImg(incoming);
    },
    [isDark]
  );

  // Animate once the reveal div mounts
  useEffect(() => {
    if (!revealImg || !revealRef.current) return;
    const { cx, cy, maxR } = clickOrigin.current;
    const reveal = revealRef.current;

    gsap.fromTo(
      reveal,
      { clipPath: `circle(0px at ${cx}px ${cy}px)` },
      {
        clipPath: `circle(${maxR}px at ${cx}px ${cy}px)`,
        duration: 0.85,
        ease: "power2.inOut",
        onComplete: () => {
          // Switch theme — the cleanup happens in the resolvedTheme effect below
          setTheme(revealImg);
        },
      }
    );
  }, [revealImg, setTheme]);

  // Clean up reveal AFTER the theme has actually propagated
  useEffect(() => {
    if (!pendingTheme.current) return;
    const isLight = resolvedTheme === "light";
    const landed =
      (pendingTheme.current === "light" && isLight) ||
      (pendingTheme.current === "dark" && !isLight);
    if (landed) {
      pendingTheme.current = null;
      setRevealImg(null);
      isAnimating.current = false;
    }
  }, [resolvedTheme]);

  useEffect(() => {
    setMounted(true);
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Orchestrated entrance timeline
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // 1. Background fade in
    if (bgRef.current) {
      tl.fromTo(bgRef.current, { opacity: 0 }, { opacity: 1, duration: 1.2 }, 0);
    }

    // 2. Navbar slides down
    if (navRef.current) {
      tl.fromTo(
        navRef.current,
        { y: -30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        0.15
      );
    }

    // 3. 3D logo section scales in (desktop)
    if (logoSectionRef.current) {
      tl.fromTo(
        logoSectionRef.current,
        { scale: 0.85, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.2, ease: "power2.out" },
        0.3
      );
    }

    // 4. Hero text lines stagger
    if (textRef.current) {
      const lines = textRef.current.querySelectorAll("[data-line]");
      tl.fromTo(
        lines,
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, stagger: 0.12 },
        0.5
      );
    }

    // 5. Mobile logo section
    if (mobileLogoRef.current) {
      tl.fromTo(
        mobileLogoRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "power2.out" },
        0.8
      );
    }
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* ── Background image ── */}
      <div ref={bgRef} className="absolute inset-0" style={{ opacity: 0 }}>
        {/* Dark video (default / dark themes) */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover object-left"
          style={{ opacity: isDark ? 1 : 0, transition: "none" }}
        >
          <source src="/video/night1.mp4" type="video/mp4" />
        </video>
        {/* Light video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover object-left"
          style={{ opacity: isDark ? 0 : 1, transition: "none" }}
        >
          <source src="/video/day.mp4" type="video/mp4" />
        </video>

        {/* Circular reveal layer — shows incoming video during transition */}
        {revealImg && (
          <div
            ref={revealRef}
            className="absolute inset-0 z-[1]"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-cover object-left"
            >
              <source src={revealImg === "light" ? "/video/day.mp4" : "/video/night1.mp4"} type="video/mp4" />
            </video>
          </div>
        )}

        {/* Right crop — gradient fade to hide Gemini logo (desktop only) */}
        <div
          className="absolute inset-y-0 right-0 z-[2] w-[15%] hidden md:block"
          style={{
            background:
              "linear-gradient(to right, transparent, black 70%)",
          }}
        />
        {/* Bottom vignette */}
        <div
          className="absolute inset-x-0 bottom-0 z-[2] h-[50%]"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
          }}
        />
        {/* Top vignette for navbar readability */}
        <div
          className="absolute inset-x-0 top-0 z-[2] h-32"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* ── Navbar — Liquid Glass ── */}
      <nav
        ref={navRef}
        className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-6xl rounded-2xl transition-all duration-500"
        style={{
          opacity: 0,
          background: scrolled
            ? "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.06) 100%)"
            : "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.04) 100%)",
          backdropFilter: "blur(40px) saturate(1.8) brightness(1.05)",
          WebkitBackdropFilter: "blur(40px) saturate(1.8) brightness(1.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: scrolled
            ? "0 8px 32px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(255,255,255,0.03)"
            : "0 4px 24px rgba(0,0,0,0.2), 0 0 0 0.5px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(255,255,255,0.02)",
        }}
      >
        {/* Top specular highlight — refraction edge */}
        <div
          className="pointer-events-none absolute top-0 left-[5%] right-[5%] h-px rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 20%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.15) 80%, transparent 100%)",
          }}
        />
        {/* Bottom subtle refraction */}
        <div
          className="pointer-events-none absolute bottom-0 left-[15%] right-[15%] h-px rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 70%, transparent 100%)",
          }}
        />
        {/* Inner glow — glass caustic */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.06) 0%, transparent 60%)",
          }}
        />

        <div className="flex items-center justify-between px-6 py-3">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight"
          >
            <Image
              src="/image/logo1.png"
              alt="neetpay"
              width={26}
              height={26}
              className="shrink-0 transition-transform duration-300 hover:rotate-12"
            />
            <span>
              <span style={{ color: isDark ? "#ffffff" : "#000000", transition: "color 0.85s ease" }}>Neet</span>
              <span className="text-[#FF6600]">pay</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-4 py-1.5 text-sm transition-all duration-200 hover:opacity-100"
                style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", transition: "color 0.85s ease" }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden items-center gap-3 md:flex">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 cursor-pointer hover:opacity-80"
              style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", transition: "color 0.85s ease" }}
              aria-label="Toggle theme"
            >
              <Sun
                size={16}
                strokeWidth={1.5}
                className="absolute transition-all duration-500"
                style={{
                  opacity: isDark ? 1 : 0,
                  transform: isDark ? "rotate(0deg) scale(1)" : "rotate(90deg) scale(0)",
                }}
              />
              <Moon
                size={16}
                strokeWidth={1.5}
                className="absolute transition-all duration-500"
                style={{
                  opacity: isDark ? 0 : 1,
                  transform: isDark ? "rotate(-90deg) scale(0)" : "rotate(0deg) scale(1)",
                }}
              />
            </button>

            <Link
              href="/login"
              className="rounded-full px-4 py-1.5 text-sm transition-all duration-200 hover:opacity-100"
              style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", transition: "color 0.85s ease" }}
            >
              Login
            </Link>

            {/* Register button with LiquidMetal border */}
            <Link href="/register" className="relative group">
              <div className="relative h-10 w-36 rounded-full overflow-hidden cursor-pointer">
                {/* LiquidMetal fills entire area */}
                <div className="absolute inset-0">
                  <LiquidMetal
                    style={{ width: "100%", height: "100%", display: "block" }}
                    colorBack="#000000"
                    colorTint="#FF6600"
                    shape="none"
                    speed={0.4}
                    distortion={0.15}
                    repetition={1.5}
                    softness={0.08}
                    contour={0.4}
                    scale={1.5}
                  />
                </div>
                {/* Inner panel covers center — only border peeks through */}
                <div
                  className="absolute inset-[1.5px] rounded-full z-[1]"
                  style={{ background: "rgba(0,0,0,0.85)" }}
                />
                <div className="relative z-10 flex h-full items-center justify-center gap-1.5">
                  <span className="text-sm font-semibold text-white drop-shadow-sm">
                    Get Started
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-white transition-transform duration-300 group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          </div>

          {/* Mobile: theme toggle + menu */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={toggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/40 hover:text-white transition-colors cursor-pointer"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 pt-20 md:hidden" style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.95) 100%)",
          backdropFilter: "blur(40px) saturate(1.8)",
          WebkitBackdropFilter: "blur(40px) saturate(1.8)",
        }}>
          <div className="flex flex-col gap-1 p-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex h-12 items-center rounded-lg px-4 text-lg text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-6 flex flex-col gap-3">
              <Link href="/login">
                <button className="w-full rounded-full border border-white/10 py-3 text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-all">
                  Login
                </button>
              </Link>
              <Link href="/register">
                <div className="relative h-12 w-full rounded-full overflow-hidden">
                  <div className="absolute inset-0">
                    <LiquidMetal
                      style={{ width: "100%", height: "100%", display: "block" }}
                      colorBack="#000000"
                      colorTint="#FF6600"
                      shape="none"
                      speed={0.4}
                      distortion={0.15}
                      repetition={1.5}
                      softness={0.08}
                      contour={0.4}
                      scale={1.5}
                    />
                  </div>
                  <div
                    className="absolute inset-[1.5px] rounded-full z-[1]"
                    style={{ background: "rgba(0,0,0,0.85)" }}
                  />
                  <div className="relative z-10 flex h-full items-center justify-center">
                    <span className="text-sm font-semibold text-white">Get Started</span>
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── 3D Logo — right side, vertically centered ── */}
      <div ref={logoSectionRef} className="absolute inset-y-0 right-0 z-10 hidden w-[45%] items-center justify-center md:flex" style={{ opacity: 0 }}>
        <div className="relative h-[55vh] w-full flex flex-col items-center justify-center">
          {/* Manifesto text — above the 3D logo */}
          <div className="relative z-20 mb-[-2rem] text-center select-none pointer-events-none mr-28">
            <p
              className="font-heading text-[11px] font-semibold uppercase tracking-[0.35em] mb-3"
              style={{ color: isDark ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.20)", transition: "color 0.85s ease" }}
            >
              A cypherpunk manifesto
            </p>
            <p
              className="font-heading text-lg sm:text-xl lg:text-2xl italic font-bold leading-snug tracking-tight"
            >
              <span style={{ color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)", transition: "color 0.85s ease" }}>Privacy is not </span>
              <span
                style={{
                  background: "linear-gradient(135deg, #FF6600 0%, #FF8533 60%, #FFaa66 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  paddingRight: "0.15em",
                }}
              >
                a feature
              </span>
              <span style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", transition: "color 0.85s ease" }}>.</span>
              <br />
              <span style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", transition: "color 0.85s ease" }}>It&apos;s </span>
              <span style={{ color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)", transition: "color 0.85s ease" }}>the </span>
              <span
                style={{
                  background: "linear-gradient(135deg, #FF6600 0%, #FF8533 60%, #FFaa66 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  paddingRight: "0.15em",
                }}
              >
                foundation
              </span>
              <span style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", transition: "color 0.85s ease" }}>.</span>
            </p>
          </div>

          {/* Glow behind model — warm orange ambient spill */}
          <div className="absolute inset-[-25%] rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 55% at 50% 48%, rgba(255,102,0,0.10) 0%, rgba(255,133,51,0.05) 30%, transparent 60%)",
            }}
          />
          {/* Secondary cool-white rim glow */}
          <div className="absolute inset-[-15%] rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 50% 50% at 55% 40%, rgba(224,232,255,0.04) 0%, transparent 50%)",
            }}
          />
          <div className="relative flex-1 w-full">
            <CrystalScene className="h-full w-full" isDark={isDark} />
          </div>
        </div>
      </div>

      {/* ── Hero Content — bottom left ── */}
      <div
        ref={heroRef}
        className="relative z-10 flex min-h-screen flex-col justify-end px-6 pt-24 pb-16 sm:px-12 md:px-20 lg:px-28"
      >
        <div ref={textRef} className="max-w-xl">
          {/* Main tagline — large italic */}
          <h1
            data-line
            className="font-heading text-5xl font-bold italic leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl"
            style={{ opacity: 0 }}
          >
            <span style={{ color: isDark ? "#ffffff" : "#000000", transition: "color 0.85s ease" }}>Pay without</span>
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #FF6600 0%, #FF8533 40%, #FFaa66 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              permission.
            </span>
          </h1>

          {/* Sub line */}
          <p
            data-line
            className="mt-6 max-w-lg text-base leading-relaxed sm:text-lg"
            style={{ opacity: 0, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)", transition: "color 0.85s ease" }}
          >
            Non-custodial crypto payments. No KYC. No middleman.
            <br className="hidden sm:block" />
            Accept XMR, BTC, ETH and 20+ currencies.
          </p>

          {/* CTA row */}
          <div data-line className="mt-8 flex items-center gap-4" style={{ opacity: 0 }}>
            {/* Primary CTA with LiquidMetal border */}
            <Link href="/register" className="group">
              <div className="relative h-12 w-44 rounded-full overflow-hidden cursor-pointer sm:h-14 sm:w-52">
                <div className="absolute inset-0">
                  <LiquidMetal
                    style={{ width: "100%", height: "100%", display: "block" }}
                    colorBack="#000000"
                    colorTint="#FF6600"
                    shape="none"
                    speed={0.5}
                    distortion={0.15}
                    repetition={1.5}
                    softness={0.06}
                    contour={0.4}
                    scale={1.8}
                  />
                </div>
                {/* Inner panel covers center — only border peeks through */}
                <div
                  className="absolute inset-[2px] rounded-full z-[1]"
                  style={{ background: "rgba(0,0,0,0.85)" }}
                />
                <div className="relative z-10 flex h-full items-center justify-center gap-2">
                  <span className="text-sm font-bold text-white sm:text-base">
                    Start accepting
                  </span>
                  <ArrowRight className="h-4 w-4 text-white transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>

            <Link
              href="/docs"
              className="rounded-full px-6 py-3 text-sm transition-all duration-[850ms] border sm:px-8 sm:py-3.5 sm:text-base hover:opacity-80"
              style={{
                color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)",
                borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
              }}
            >
              Documentation
            </Link>
          </div>

          {/* Mono tagline */}
          <p
            data-line
            className="mt-10 font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500/40 sm:text-xs"
            style={{ opacity: 0 }}
          >
            permissionless payments infrastructure
          </p>
        </div>

        {/* 3D logo for mobile — below text */}
        <div ref={mobileLogoRef} className="mt-8 w-full md:hidden" style={{ opacity: 0 }}>
          <div className="text-center select-none mb-[-1rem]">
            <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.3em] text-white/25 mb-2">
              A cypherpunk manifesto
            </p>
            <p className="font-heading text-base italic font-bold leading-snug tracking-tight">
              <span className="text-white/90">Privacy is not </span>
              <span
                style={{
                  background: "linear-gradient(135deg, #FF6600 0%, #FF8533 60%, #FFaa66 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  paddingRight: "0.15em",
                }}
              >
                a feature
              </span>
              <span className="text-white/40">.</span>
              <br />
              <span className="text-white/40">It&apos;s </span>
              <span className="text-white/90">the </span>
              <span
                style={{
                  background: "linear-gradient(135deg, #FF6600 0%, #FF8533 60%, #FFaa66 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  paddingRight: "0.15em",
                }}
              >
                foundation
              </span>
              <span className="text-white/40">.</span>
            </p>
          </div>
          <div className="h-[50vh] pointer-events-none touch-none">
            <CrystalScene className="h-full w-full" isDark={isDark} />
          </div>
        </div>
      </div>
    </div>
  );
}
