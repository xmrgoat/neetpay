"use client";

import { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Menu, X } from "lucide-react";
import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useGSAP(
    () => {
      if (!navRef.current) return;
      gsap.fromTo(navRef.current,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }
      );
    },
    { scope: navRef }
  );

  useGSAP(
    () => {
      if (!mobileMenuRef.current || !mobileOpen) return;
      const items = mobileMenuRef.current.querySelectorAll("[data-nav-item]");
      gsap.from(items, {
        y: 20,
        opacity: 0,
        duration: 0.4,
        stagger: 0.05,
        ease: "power3.out",
      });
    },
    { dependencies: [mobileOpen], scope: mobileMenuRef }
  );

  return (
    <>
      <nav
        ref={navRef}
        className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center transition-all duration-500"
        style={{
          opacity: 0,
          ...(scrolled ? {
            backdropFilter: "blur(24px) brightness(0.6)",
            WebkitBackdropFilter: "blur(24px) brightness(0.6)",
            maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
          } : {}),
        }}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight"
          >
            <Image src="/image/logo1.png" alt="neetpay" width={28} height={28} className="shrink-0" />
            <span>
              <span className="text-white">neet</span>
              <span className="text-primary">pay</span>
            </span>
          </Link>

          {/* Desktop nav — pill style links */}
          <div className="hidden items-center gap-2 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-white/[0.08] px-5 py-2 text-sm text-[#ccc] transition-all duration-200 hover:bg-white/[0.05] hover:text-white hover:border-white/[0.15]"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop actions — pill style */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="rounded-full px-5 py-2 text-sm text-[#ccc] transition-all duration-200 hover:text-white"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-white/[0.12] px-5 py-2 text-sm text-white transition-all duration-200 hover:bg-white/[0.05] hover:border-white/[0.2]"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#999] hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          ref={mobileMenuRef}
          className="fixed inset-0 z-40 bg-[#08080c] pt-16 md:hidden"
        >
          <div className="flex flex-col gap-1 p-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-nav-item
                onClick={() => setMobileOpen(false)}
                className="flex h-12 items-center rounded-lg px-4 text-lg text-[#999] hover:text-white hover:bg-white/[0.03] transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-6 flex flex-col gap-3" data-nav-item>
              <Link href="/login">
                <button className="w-full rounded-full border border-white/[0.1] py-3 text-sm text-[#ccc] hover:text-white hover:bg-white/[0.03] transition-all">
                  Login
                </button>
              </Link>
              <Link href="/register">
                <button className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-black hover:bg-primary-hover transition-all">
                  Get Started
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
