"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Link2,
  BarChart3,
  Code,
  CreditCard,
  Settings,
  Menu,
  X,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { logout, getToken } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { DASHBOARD_NAV } from "@/lib/constants";

const STORAGE_KEY = "sidebar-collapsed";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  FileText,
  Link: Link2,
  BarChart3,
  Code,
  CreditCard,
  Settings,
};

const NAV_ITEMS = DASHBOARD_NAV.map((item) => ({
  label: item.label,
  icon: ICON_MAP[item.icon] ?? LayoutDashboard,
  href: item.href,
}));

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
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      const token = getToken();
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserEmail(payload.email || null);
      }
    } catch { /* ignore */ }
  }, []);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCollapsed(getStoredCollapsed());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      /* */
    }
  }, [collapsed, mounted]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!showUserMenu) return;
    function handleClick(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showUserMenu]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  // ─── Nav Item ─────────────────────────────────────────────────────────────

  function NavItem({
    item,
    mobile,
  }: {
    item: {
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      href: string;
    };
    mobile?: boolean;
  }) {
    const active = isActive(item.href);

    return (
      <Link
        href={item.href}
        title={collapsed && !mobile ? item.label : undefined}
        onClick={mobile ? () => setMobileOpen(false) : undefined}
        className={cn(
          "sidebar-item group relative flex items-center gap-3 rounded-lg text-[13.5px]",
          "transition-[background-color,color] duration-[140ms] ease-out",
          "h-[38px]",
          collapsed && !mobile ? "justify-center px-0 mx-0.5" : "px-3",
          active
            ? "font-medium text-primary"
            : "text-foreground-secondary hover:bg-white/[0.05] hover:text-foreground",
        )}
      >
        {active && (
          <span
            className="absolute left-0 top-[7px] bottom-[7px] w-[2px] rounded-full bg-primary"
            aria-hidden
          />
        )}
        <item.icon
          className={cn(
            "shrink-0 h-[19px] w-[19px]",
            active ? "text-primary" : "",
          )}
        />
        {(!collapsed || mobile) && (
          <span className="truncate">{item.label}</span>
        )}
      </Link>
    );
  }

  // ─── Sidebar Content ──────────────────────────────────────────────────────

  function SidebarNav({ mobile }: { mobile?: boolean }) {
    return (
      <>
        {/* Logo */}
        <div
          className={cn(
            "flex shrink-0 items-center border-b border-border",
            collapsed && !mobile ? "h-14 justify-center" : "h-14 px-3",
          )}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-heading font-semibold"
            onClick={mobile ? () => setMobileOpen(false) : undefined}
          >
            <Image
              src="/image/logo1.png"
              alt="neetpay"
              width={22}
              height={22}
              className="shrink-0"
            />
            {(!collapsed || mobile) && (
              <span className="text-[15px] tracking-[-0.01em]">
                <span className="text-foreground">neet</span>
                <span className="text-primary">pay</span>
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pt-3 pb-2 no-scrollbar">
          <div className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => (
              <NavItem key={item.href} item={item} mobile={mobile} />
            ))}
          </div>
        </nav>

        {/* Bottom — User + Collapse */}
        <div className="mt-auto shrink-0 border-t border-border px-3 pt-3 pb-3.5">
          {/* User profile row */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={cn(
                "w-full flex items-center rounded-lg cursor-pointer",
                "transition-[background-color] duration-[140ms] ease-out",
                "hover:bg-white/[0.05]",
                collapsed && !mobile
                  ? "justify-center h-[40px] px-0 mx-0.5"
                  : "gap-2.5 px-3 h-[40px]",
              )}
            >
              {/* Avatar */}
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.12] text-[11px] font-medium uppercase text-white/70"
              >
                {userEmail?.charAt(0)?.toUpperCase() ?? "U"}
              </div>

              {(!collapsed || mobile) && (
                <>
                  <span className="truncate text-[13px] text-foreground-secondary">
                    {userEmail ?? "User"}
                  </span>
                  <LogOut
                    className="ml-auto h-3.5 w-3.5 shrink-0 text-white/20 transition-colors hover:text-foreground-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      logout();
                    }}
                  />
                </>
              )}
            </button>

            {/* Collapsed popover */}
            {showUserMenu && collapsed && !mobile && (
              <div
                className="absolute left-full top-0 ml-2 w-[140px] rounded-lg bg-elevated border border-border shadow-lg z-50 py-1"
              >
                <Link
                  href="/dashboard/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-[13px] text-foreground-secondary hover:text-foreground hover:bg-white/[0.04] transition-colors"
                >
                  Settings
                </Link>
                <button
                  onClick={() => logout()}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-error hover:bg-error/[0.06] transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            )}

            {/* Expanded popover */}
            {showUserMenu && !collapsed && (
              <div
                className="absolute bottom-full left-0 right-0 mb-2 rounded-lg bg-elevated border border-border shadow-lg z-50 py-1"
              >
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-[11px] text-muted truncate">
                    {userEmail ?? ""}
                  </p>
                </div>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-[13px] text-foreground-secondary hover:text-foreground hover:bg-white/[0.04] transition-colors"
                >
                  Profile
                </Link>
                <div className="border-t border-border py-1">
                  <button
                    onClick={() => logout()}
                    className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-error hover:bg-error/[0.06] transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Collapse toggle — desktop only */}
          {!mobile && mounted && (
            <button
              onClick={toggleCollapsed}
              className={cn(
                "mt-1.5 flex h-[28px] w-full items-center justify-center rounded-lg",
                "text-white/30 hover:text-white/50 transition-colors duration-[140ms]",
              )}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-[15px] w-[15px]" />
              ) : (
                <PanelLeftClose className="h-[15px] w-[15px]" />
              )}
            </button>
          )}
        </div>
      </>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

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
          className="fixed inset-0 z-40 bg-black/60 lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-dvh w-[280px] flex-col border-r border-border bg-[#0e0e12] transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-foreground-secondary hover:text-foreground transition-colors"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarNav mobile />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden h-dvh shrink-0 flex-col border-r border-border bg-[#0e0e12] lg:flex"
        style={{
          width: mounted ? (collapsed ? 60 : 240) : 240,
          minWidth: mounted ? (collapsed ? 60 : 240) : 240,
          transition:
            "width 250ms cubic-bezier(0.16, 1, 0.3, 1), min-width 250ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <SidebarNav />
      </aside>
    </>
  );
}
