"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Repeat,
  Link as LinkIcon,
  BarChart3,
  Code,
  Settings,
  ChevronLeft,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const STORAGE_KEY = "sidebar-collapsed";

const MAIN_NAV = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Wallet", icon: Wallet, href: "/dashboard/wallet" },
  { label: "Swap", icon: Repeat, href: "/dashboard/swap" },
  { label: "Payments", icon: ArrowLeftRight, href: "/dashboard/payments" },
  { label: "Payment Links", icon: LinkIcon, href: "/dashboard/links" },
  { label: "Analytics", icon: BarChart3, href: "/dashboard/analytics" },
] as const;

const OTHER_NAV = [
  { label: "Developers", icon: Code, href: "/dashboard/developers" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
] as const;

function getStoredCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCollapsed(getStoredCollapsed());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch { /* ignore */ }
  }, [collapsed, mounted]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  useGSAP(
    () => {
      if (!navRef.current) return;
      const items = navRef.current.querySelectorAll("[data-nav-item]");
      if (!items.length) return;
      gsap.fromTo(
        items,
        { opacity: 0, x: -8 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.04, ease: "power2.out" },
      );
    },
    { scope: navRef, dependencies: [mounted] },
  );

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  function NavItem({ item }: { item: { label: string; icon: React.ComponentType<{ className?: string }>; href: string } }) {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        data-nav-item
        className={cn(
          "relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150",
          active
            ? "bg-primary-muted text-primary font-medium"
            : "text-foreground-secondary hover:text-foreground hover:bg-surface",
        )}
      >
        {active && (
          <span
            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary transition-all duration-300"
            aria-hidden
          />
        )}
        <item.icon className="h-[18px] w-[18px] shrink-0" />
        <span
          className={cn(
            "truncate text-sm transition-[opacity,width] duration-200",
            collapsed
              ? "w-0 opacity-0 pointer-events-none"
              : "w-auto opacity-100",
          )}
        >
          {item.label}
        </span>
      </Link>
    );
  }

  function SectionLabel({ text }: { text: string }) {
    return (
      <p
        className={cn(
          "mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted transition-[opacity] duration-200",
          collapsed && "opacity-0",
        )}
      >
        {text}
      </p>
    );
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
        <Link
          href="/dashboard"
          className="flex items-center font-heading text-xl font-bold tracking-tight"
        >
          {collapsed ? (
            <span>
              <span className="text-foreground">n</span>
              <span className="text-primary">p</span>
            </span>
          ) : (
            <span>
              <span className="text-foreground">neet</span>
              <span className="text-primary">pay</span>
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav ref={navRef} className="flex-1 overflow-y-auto px-3 py-5">
        <SectionLabel text="Main" />
        <div className="flex flex-col gap-0.5">
          {MAIN_NAV.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>

        <div className="my-4 h-px bg-border" />

        <SectionLabel text="Other" />
        <div className="flex flex-col gap-0.5">
          {OTHER_NAV.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div className="mt-auto shrink-0 border-t border-border p-3">
        <div
          className={cn(
            "flex h-9 items-center rounded-lg text-foreground-secondary transition-colors duration-150 hover:text-foreground hover:bg-surface",
            collapsed ? "justify-center" : "px-3 gap-3",
          )}
        >
          <ThemeToggle />
          <span
            className={cn(
              "truncate text-sm transition-[opacity,width] duration-200",
              collapsed ? "w-0 opacity-0 pointer-events-none" : "w-auto opacity-100",
            )}
          >
            Theme
          </span>
        </div>

        <button
          onClick={toggleCollapsed}
          className={cn(
            "flex h-9 w-full items-center rounded-lg text-foreground-secondary transition-colors duration-150 hover:text-foreground hover:bg-surface",
            collapsed ? "justify-center" : "px-3 gap-3",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={cn(
              "h-[18px] w-[18px] shrink-0 transition-transform duration-300",
              collapsed && "rotate-180",
            )}
          />
          <span
            className={cn(
              "truncate text-sm transition-[opacity,width] duration-200",
              collapsed ? "w-0 opacity-0 pointer-events-none" : "w-auto opacity-100",
            )}
          >
            Collapse
          </span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className={cn(
          "fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-elevated text-foreground-secondary hover:text-foreground transition-colors lg:hidden",
          mobileOpen && "hidden",
        )}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-dvh w-64 flex-col border-r border-border bg-background transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-foreground-secondary hover:text-foreground transition-colors"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
          <Link
            href="/dashboard"
            className="flex items-center font-heading text-xl font-bold tracking-tight"
            onClick={() => setMobileOpen(false)}
          >
            <span className="text-foreground">neet</span>
            <span className="text-primary">pay</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Main</p>
          <ul className="flex flex-col gap-0.5">
            {MAIN_NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150",
                      active
                        ? "bg-primary-muted text-primary font-medium"
                        : "text-foreground-secondary hover:text-foreground hover:bg-surface",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary" aria-hidden />
                    )}
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate text-sm">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="my-4 h-px bg-border" />

          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Other</p>
          <ul className="flex flex-col gap-0.5">
            {OTHER_NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150",
                      active
                        ? "bg-primary-muted text-primary font-medium"
                        : "text-foreground-secondary hover:text-foreground hover:bg-surface",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary" aria-hidden />
                    )}
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate text-sm">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto shrink-0 border-t border-border p-3">
          <div className="flex h-9 items-center gap-3 rounded-lg px-3 text-foreground-secondary">
            <ThemeToggle />
            <span className="text-sm">Theme</span>
          </div>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        style={{
          width: mounted ? (collapsed ? 72 : 240) : 240,
          minWidth: mounted ? (collapsed ? 72 : 240) : 240,
          transition: "width 300ms cubic-bezier(0.4, 0, 0.2, 1), min-width 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        className="hidden h-dvh flex-col border-r border-border bg-background lg:flex shrink-0"
      >
        {sidebarContent}
      </aside>
    </>
  );
}
