"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  Bell,
  Settings,
  LayoutGrid,
  Plus,
  Palette,
  Search,
  Check,
  X,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWidgetContext } from "@/hooks/use-widget-context";
import {
  WIDGET_REGISTRY,
  DEFAULT_VISIBLE_WIDGETS,
} from "@/lib/dashboard/widget-registry";

// ─── Notification Data ──────────────────────────────────────────────────────

interface Notification {
  id: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
}

const EMPTY_NOTIFICATIONS: Notification[] = [];

// ─── Theme Options ──────────────────────────────────────────────────────────

const THEME_OPTIONS = [
  { id: "dark",     label: "Dark",     gradient: "from-[#0c0c0f] to-[#1a1a1f]", dot: "#56565f" },
  { id: "midnight", label: "Midnight", gradient: "from-[#0b0e1a] to-[#171d33]", dot: "#3b5998" },
  { id: "ember",    label: "Ember",    gradient: "from-[#110a06] to-[#231710]", dot: "#ff6600" },
  { id: "ocean",    label: "Ocean",    gradient: "from-[#06100f] to-[#102221]", dot: "#22d3ee" },
  { id: "emerald",  label: "Emerald",  gradient: "from-[#060f0b] to-[#10231a]", dot: "#34d399" },
  { id: "rose",     label: "Rose",     gradient: "from-[#100609] to-[#231017]", dot: "#fb7185" },
  { id: "light",    label: "Light",    gradient: "from-[#f7f7f8] to-[#ebebed]", dot: "#c8c8ce" },
];

// ─── localStorage keys for widget visibility (shared with useWidgetLayout) ──

const STORAGE_KEY_VISIBLE = "neetpay-widget-visible";
const STORAGE_KEY_LAYOUT = "neetpay-widget-layout";

function loadVisibleWidgets(): string[] {
  if (typeof window === "undefined") return DEFAULT_VISIBLE_WIDGETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VISIBLE);
    return raw ? (JSON.parse(raw) as string[]) : DEFAULT_VISIBLE_WIDGETS;
  } catch {
    return DEFAULT_VISIBLE_WIDGETS;
  }
}

function saveVisibleWidgets(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY_VISIBLE, JSON.stringify(ids));
  } catch { /* ignore */ }
}

// ─── Dropdown Wrapper ───────────────────────────────────────────────────────

function Dropdown({
  open,
  onClose,
  children,
  align = "right",
  width = "w-72",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  align?: "right" | "left";
  width?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!open || !ref.current) return;
    gsap.fromTo(ref.current,
      { opacity: 0, y: -6, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power3.out" }
    );
  }, { dependencies: [open] });

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={ref}
        className={cn(
          "absolute top-full mt-2 z-50 rounded-xl border border-border bg-elevated shadow-xl",
          width,
          align === "right" ? "right-0" : "left-0"
        )}
      >
        {children}
      </div>
    </>
  );
}

// ─── Main Header Component ──────────────────────────────────────────────────

interface DashboardHeaderProps {
  userName?: string | null;
}

export function DashboardHeader({ userName }: DashboardHeaderProps = {}) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const { isWidgetPage } = useWidgetContext();

  const isAnalyticsPage = pathname === "/dashboard/analytics";

  // Local state for widget visibility toggles (syncs with localStorage)
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>(DEFAULT_VISIBLE_WIDGETS);

  useEffect(() => {
    setVisibleWidgets(loadVisibleWidgets());
  }, []);

  // Listen for storage events from the widget grid
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY_VISIBLE && e.newValue) {
        try {
          setVisibleWidgets(JSON.parse(e.newValue));
        } catch { /* ignore */ }
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleToggleWidget = useCallback((widgetId: string) => {
    setVisibleWidgets((prev) => {
      const next = prev.includes(widgetId)
        ? prev.filter((id) => id !== widgetId)
        : [...prev, widgetId];
      saveVisibleWidgets(next);
      // Dispatch storage event for the widget grid to pick up
      window.dispatchEvent(new StorageEvent("storage", {
        key: STORAGE_KEY_VISIBLE,
        newValue: JSON.stringify(next),
      }));
      return next;
    });
  }, []);

  const handleResetWidgets = useCallback(() => {
    setVisibleWidgets(DEFAULT_VISIBLE_WIDGETS);
    saveVisibleWidgets(DEFAULT_VISIBLE_WIDGETS);
    // Also reset layout
    try { localStorage.removeItem(STORAGE_KEY_LAYOUT); } catch { /* ignore */ }
    window.dispatchEvent(new StorageEvent("storage", {
      key: STORAGE_KEY_VISIBLE,
      newValue: JSON.stringify(DEFAULT_VISIBLE_WIDGETS),
    }));
    window.dispatchEvent(new StorageEvent("storage", {
      key: STORAGE_KEY_LAYOUT,
      newValue: null,
    }));
    // Reload to re-hydrate
    window.location.reload();
  }, []);

  const unreadCount = EMPTY_NOTIFICATIONS.filter((n) => n.unread).length;

  function toggle(id: string) {
    setActiveDropdown(activeDropdown === id ? null : id);
  }

  function close() {
    setActiveDropdown(null);
  }

  // Group widgets by category for the dropdown
  const kpiWidgets = WIDGET_REGISTRY.filter((w) => w.category === "kpi");
  const chartWidgets = WIDGET_REGISTRY.filter((w) => w.category === "chart");
  const deepWidgets = WIDGET_REGISTRY.filter((w) => w.category === "deep");

  return (
    <div ref={headerRef} className="flex items-center gap-2">
      {/* ── Search ── */}
      <button
        onClick={() => toggle("search")}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface/60 text-muted transition-all duration-200 hover:bg-surface hover:text-foreground hover:border-border-hover active:scale-95",
          activeDropdown === "search" && "bg-surface text-foreground border-border-hover"
        )}
      >
        <Search className="h-3.5 w-3.5" />
      </button>

      {/* ── Notifications ── */}
      <div className="relative">
        <button
          onClick={() => toggle("notifications")}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface/60 text-muted transition-all duration-200 hover:bg-surface hover:text-foreground hover:border-border-hover active:scale-95",
            activeDropdown === "notifications" && "bg-surface text-foreground border-border-hover"
          )}
        >
          <Bell className="h-3.5 w-3.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[7px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>

        <Dropdown open={activeDropdown === "notifications"} onClose={close}>
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-foreground">Notifications</h3>
              <button className="text-[10px] font-medium text-primary hover:text-primary-hover transition-colors">
                Mark all read
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto no-scrollbar">
            {EMPTY_NOTIFICATIONS.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <Bell className="h-5 w-5 text-muted/40 mb-2" />
                <p className="text-[12px] text-muted">No notifications yet</p>
                <p className="text-[10px] text-muted/60 mt-0.5">Payment updates will appear here</p>
              </div>
            ) : (
              EMPTY_NOTIFICATIONS.map((n) => (
                <button
                  key={n.id}
                  className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface/50"
                >
                  <div className="mt-1 shrink-0">
                    {n.unread ? (
                      <span className="block h-2 w-2 rounded-full bg-primary" />
                    ) : (
                      <span className="block h-2 w-2 rounded-full bg-border" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-[12px] font-medium", n.unread ? "text-foreground" : "text-foreground-secondary")}>
                      {n.title}
                    </p>
                    <p className="text-[11px] text-muted truncate">{n.desc}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted tabular-nums">{n.time}</span>
                </button>
              ))
            )}
          </div>
          <div className="p-2 border-t border-border">
            <button className="w-full rounded-lg py-1.5 text-[11px] font-medium text-muted hover:text-foreground hover:bg-surface transition-colors">
              View all notifications
            </button>
          </div>
        </Dropdown>
      </div>

      {/* ── Theme Picker ── */}
      <div className="relative">
        <button
          onClick={() => toggle("theme")}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface/60 text-muted transition-all duration-200 hover:bg-surface hover:text-foreground hover:border-border-hover active:scale-95",
            activeDropdown === "theme" && "bg-surface text-foreground border-border-hover"
          )}
        >
          <Palette className="h-3.5 w-3.5" />
        </button>

        <Dropdown open={activeDropdown === "theme"} onClose={close} width="w-52">
          <div className="p-3 border-b border-border">
            <h3 className="text-[13px] font-semibold text-foreground">Theme</h3>
            <p className="text-[10px] text-muted mt-0.5">Choose your vibe</p>
          </div>
          <div className="p-1.5 space-y-0.5">
            {THEME_OPTIONS.map((t) => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all duration-150",
                    active
                      ? "bg-primary/10 ring-1 ring-primary/30"
                      : "hover:bg-surface/50"
                  )}
                >
                  <div
                    className={cn(
                      "h-6 w-6 shrink-0 rounded-full bg-gradient-to-br shadow-inner",
                      t.gradient,
                      t.id === "light" && "ring-1 ring-inset ring-border"
                    )}
                  />
                  <span className={cn(
                    "flex-1 text-[12px] font-medium",
                    active ? "text-foreground" : "text-foreground-secondary"
                  )}>
                    {t.label}
                  </span>
                  {active && (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </Dropdown>
      </div>

      {/* ── Settings ── */}
      <a
        href="/dashboard/settings"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface/60 text-muted transition-all duration-200 hover:bg-surface hover:text-foreground hover:border-border-hover active:scale-95"
      >
        <Settings className="h-3.5 w-3.5" />
      </a>

      {/* ── Divider ── */}
      <div className="h-5 w-px bg-border/50 mx-0.5" />

      {/* ── Manage Widgets (functional) ── */}
      <div className="relative">
        <button
          onClick={() => toggle("widgets")}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-3 text-[11px] font-medium text-muted transition-all duration-200 hover:bg-surface hover:text-foreground hover:border-border-hover active:scale-[0.98]",
            activeDropdown === "widgets" && "bg-surface text-foreground border-border-hover"
          )}
        >
          <LayoutGrid className="h-3 w-3" />
          <span className="hidden sm:inline">Manage Widgets</span>
        </button>

        <Dropdown open={activeDropdown === "widgets"} onClose={close} width="w-72">
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[13px] font-semibold text-foreground">Dashboard Widgets</h3>
                <p className="text-[10px] text-muted mt-0.5">
                  {visibleWidgets.length} of {WIDGET_REGISTRY.length} active
                </p>
              </div>
              <button
                onClick={handleResetWidgets}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted hover:text-foreground hover:bg-surface transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2 no-scrollbar">
            {/* KPIs */}
            <p className="px-2.5 pt-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">KPI Cards</p>
            {kpiWidgets.map((w) => {
              const isActive = visibleWidgets.includes(w.id);
              const Icon = w.icon;
              return (
                <label
                  key={w.id}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-surface/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => handleToggleWidget(w.id)}
                    className="h-3.5 w-3.5 rounded border-border accent-primary"
                  />
                  <Icon className="h-3.5 w-3.5 text-muted shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-foreground-secondary">{w.label}</p>
                  </div>
                </label>
              );
            })}

            {/* Charts */}
            <p className="px-2.5 pt-3 pb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">Charts</p>
            {chartWidgets.map((w) => {
              const isActive = visibleWidgets.includes(w.id);
              const Icon = w.icon;
              return (
                <label
                  key={w.id}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-surface/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => handleToggleWidget(w.id)}
                    className="h-3.5 w-3.5 rounded border-border accent-primary"
                  />
                  <Icon className="h-3.5 w-3.5 text-muted shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-foreground-secondary">{w.label}</p>
                  </div>
                </label>
              );
            })}

            {/* Deep Analytics */}
            <p className="px-2.5 pt-3 pb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">Deep Analytics</p>
            {deepWidgets.map((w) => {
              const isActive = visibleWidgets.includes(w.id);
              const Icon = w.icon;
              return (
                <label
                  key={w.id}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-surface/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => handleToggleWidget(w.id)}
                    className="h-3.5 w-3.5 rounded border-border accent-primary"
                  />
                  <Icon className="h-3.5 w-3.5 text-muted shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-foreground-secondary">{w.label}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </Dropdown>
      </div>

      {/* ── Add New Widget ── */}
      <button
        onClick={() => {
          if (isAnalyticsPage) {
            window.dispatchEvent(new CustomEvent("neetpay:open-add-widget"));
          } else {
            window.location.href = "/dashboard/analytics";
          }
        }}
        className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[11px] font-semibold text-white transition-all duration-200 hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.98]"
        style={{
          boxShadow: "0 2px 12px rgba(255,102,0,0.25)",
        }}
      >
        <Plus className="h-3 w-3" />
        <span className="hidden sm:inline">Add Widget</span>
      </button>
    </div>
  );
}
