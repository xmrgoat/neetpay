"use client";

import { useRef, useState } from "react";
import { useTheme } from "next-themes";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Notification Data ──────────────────────────────────────────────────────

const FAKE_NOTIFICATIONS = [
  { id: "n1", title: "Payment received", desc: "0.0421 BTC — $2,840.00", time: "2m ago", unread: true },
  { id: "n2", title: "Payout completed", desc: "$1,200.00 sent to wallet", time: "1h ago", unread: true },
  { id: "n3", title: "New payment link created", desc: "Premium Plan — $49.99/mo", time: "3h ago", unread: false },
  { id: "n4", title: "Exchange completed", desc: "0.5 ETH → 0.024 BTC", time: "5h ago", unread: false },
];

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

// ─── Widget Options ─────────────────────────────────────────────────────────

const WIDGET_OPTIONS = [
  { id: "revenue", label: "Revenue Chart", desc: "Track daily revenue" },
  { id: "payments", label: "Payments Summary", desc: "Payment stats overview" },
  { id: "crypto", label: "Crypto Prices", desc: "Live market prices" },
  { id: "links", label: "Payment Links", desc: "Active payment links" },
  { id: "activity", label: "Activity Feed", desc: "Recent account activity" },
];

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

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  const unreadCount = FAKE_NOTIFICATIONS.filter((n) => n.unread).length;

  function toggle(id: string) {
    setActiveDropdown(activeDropdown === id ? null : id);
  }

  function close() {
    setActiveDropdown(null);
  }

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
            {FAKE_NOTIFICATIONS.map((n) => (
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
            ))}
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
      <button
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface/60 text-muted transition-all duration-200 hover:bg-surface hover:text-foreground hover:border-border-hover active:scale-95"
      >
        <Settings className="h-3.5 w-3.5" />
      </button>

      {/* ── Divider ── */}
      <div className="h-5 w-px bg-border/50 mx-0.5" />

      {/* ── Manage Widgets ── */}
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

        <Dropdown open={activeDropdown === "widgets"} onClose={close} width="w-64">
          <div className="p-3 border-b border-border">
            <h3 className="text-[13px] font-semibold text-foreground">Dashboard Widgets</h3>
            <p className="text-[10px] text-muted mt-0.5">Toggle widgets on your dashboard</p>
          </div>
          <div className="p-2 space-y-0.5">
            {WIDGET_OPTIONS.map((w) => (
              <label
                key={w.id}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-surface/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  defaultChecked={["revenue", "payments", "crypto"].includes(w.id)}
                  className="h-3.5 w-3.5 rounded border-border accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-foreground-secondary">{w.label}</p>
                  <p className="text-[10px] text-muted">{w.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </Dropdown>
      </div>

      {/* ── Add New Widget ── */}
      <button
        className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[11px] font-semibold text-white transition-all duration-200 hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.98]"
        style={{
          boxShadow: "0 2px 12px rgba(255,102,0,0.25)",
        }}
      >
        <Plus className="h-3 w-3" />
        <span className="hidden sm:inline">Add new Widget</span>
      </button>
    </div>
  );
}
