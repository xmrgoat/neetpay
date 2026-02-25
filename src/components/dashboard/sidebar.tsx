"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);

  return (
    <aside
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
      className={cn(
        "fixed left-0 top-0 z-40 flex h-dvh flex-col border-r border-border bg-surface transition-[width] duration-200 ease-out",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-base font-bold tracking-tight"
        >
          <span className="text-primary text-lg">n</span>
          {!collapsed && (
            <span className="whitespace-nowrap">
              <span className="text-foreground">neet</span>
              <span className="text-primary">pay</span>
            </span>
          )}
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground-secondary hover:text-foreground hover:bg-elevated"
                  )}
                >
                  <item.icon size={18} className="shrink-0" />
                  {!collapsed && (
                    <span className="whitespace-nowrap">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-border p-2 space-y-1">
        <div className="flex items-center justify-center px-3 py-2">
          <ThemeToggle />
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground-secondary hover:text-foreground hover:bg-elevated transition-colors"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Log out</span>}
        </button>
      </div>

      {/* Collapse indicator */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-foreground-secondary hover:text-foreground transition-colors"
      >
        <ChevronLeft
          size={12}
          className={cn(
            "transition-transform",
            collapsed && "rotate-180"
          )}
        />
      </button>
    </aside>
  );
}
