"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CRYPTO_COLORS } from "@/lib/constants";
import {
  ChevronDown,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CryptoIcon } from "@/components/icons/crypto-icons";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CryptoHolding {
  currency: string;
  amount: number;
  usdValue: number;
  price?: number;
  change24h?: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const CRYPTO_NAMES: Record<string, string> = {
  XMR: "Monero",
};

export const CRYPTO_ICONS: Record<string, string> = {
  XMR: "ɱ",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

export function formatCryptoAmount(amount: number): string {
  if (amount === 0) return "0";
  if (amount >= 1_000) return amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (amount >= 1) return amount.toFixed(4);
  if (amount >= 0.001) return amount.toFixed(6);
  return amount.toFixed(8);
}

export function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Fiat ────────────────────────────────────────────────────────────────────

export const FIAT_CURRENCY = "EUR";
export const FIAT_SIGN = "€";
export const USD_TO_FIAT = 0.92; // 1 USD ≈ 0.92 EUR

export function formatFiat(usdValue: number): string {
  const v = usdValue * USD_TO_FIAT;
  if (v >= 1_000_000) return `${FIAT_SIGN}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${FIAT_SIGN}${(v / 1_000).toFixed(2)}K`;
  return `${FIAT_SIGN}${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Amount Mode Toggle ─────────────────────────────────────────────────────

export function AmountModeToggle({
  inFiat,
  crypto,
  onToggle,
}: {
  inFiat: boolean;
  crypto: string;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center rounded-lg overflow-hidden border border-border"
    >
      <span
        className={cn(
          "px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all duration-200",
          !inFiat ? "bg-primary text-white" : "bg-transparent text-muted hover:text-foreground-secondary"
        )}
      >
        {crypto}
      </span>
      <span
        className={cn(
          "px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all duration-200",
          inFiat ? "bg-primary text-white" : "bg-transparent text-muted hover:text-foreground-secondary"
        )}
      >
        {FIAT_CURRENCY}
      </span>
    </button>
  );
}

// ─── Panel Types & Tab Bar ──────────────────────────────────────────────────

export type PanelType = "send" | "receive";

const TAB_CONFIG: { id: PanelType; label: string; icon: typeof ArrowUpRight }[] = [
  { id: "send", label: "Send", icon: ArrowUpRight },
  { id: "receive", label: "Receive", icon: ArrowDownLeft },
];

export function PanelTabBar({
  active,
  onSwitch,
}: {
  active: PanelType;
  onSwitch: (panel: PanelType) => void;
}) {
  const activeIdx = TAB_CONFIG.findIndex((t) => t.id === active);

  return (
    <div
      className="relative flex items-center rounded-xl p-1"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      {/* Sliding pill */}
      <div
        className="absolute top-1 bottom-1 rounded-lg bg-primary transition-all duration-300 ease-out"
        style={{
          width: `calc(${100 / 2}% - 5px)`,
          left: `calc(${activeIdx * (100 / 2)}% + ${activeIdx === 0 ? 4 : 0}px)`,
        }}
      />

      {TAB_CONFIG.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onSwitch(tab.id)}
            className={cn(
              "relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold transition-all duration-200",
              isActive ? "text-white" : "text-muted hover:text-foreground"
            )}
          >
            <Icon className="h-3 w-3" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Crypto Selector Dropdown ───────────────────────────────────────────────

export function CryptoSelector({
  selected,
  holdings,
  onSelect,
  exclude,
}: {
  selected: string;
  holdings: CryptoHolding[];
  onSelect: (currency: string) => void;
  exclude?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    let list = holdings.filter((h) => h.currency !== exclude);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((h) => {
        const name = CRYPTO_NAMES[h.currency] ?? h.currency;
        return h.currency.toLowerCase().includes(q) || name.toLowerCase().includes(q);
      });
    }
    return list;
  }, [holdings, exclude, search]);

  const color = CRYPTO_COLORS[selected] ?? "#737373";
  const name = CRYPTO_NAMES[selected] ?? selected;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useGSAP(() => {
    if (!open || !dropdownRef.current) return;
    const dropdown = dropdownRef.current.querySelector("[data-dropdown]");
    if (!dropdown) return;
    gsap.fromTo(dropdown,
      { opacity: 0, y: -6, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power3.out" }
    );
  }, { dependencies: [open] });

  return (
    <div ref={dropdownRef} className={cn("relative", open && "z-50")}>
      <button
        onClick={() => { setOpen(!open); setSearch(""); }}
        className="flex items-center gap-2.5 rounded-xl border border-border bg-surface/60 px-3 py-2.5 transition-all duration-200 hover:bg-surface hover:border-border-hover active:scale-[0.98]"
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 2px 10px ${color}40` }}
        >
          <CryptoIcon symbol={selected} size={32} />
        </div>
        <div className="text-left">
          <p className="text-[13px] font-semibold text-foreground">{selected}</p>
          <p className="text-[10px] text-muted">{name}</p>
        </div>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div
          data-dropdown
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-elevated p-1.5 shadow-xl"
        >
          {/* Search */}
          <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 mb-1.5">
            <Search className="h-3 w-3 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              autoFocus
              className="w-full bg-transparent text-[12px] text-foreground placeholder:text-muted outline-none"
            />
          </div>

          {/* List */}
          <div className="max-h-52 overflow-y-auto no-scrollbar">
            {filtered.map((h) => {
              const c = CRYPTO_COLORS[h.currency] ?? "#737373";
              const n = CRYPTO_NAMES[h.currency] ?? h.currency;
              const isSelected = h.currency === selected;

              return (
                <button
                  key={h.currency}
                  onClick={() => { onSelect(h.currency); setOpen(false); setSearch(""); }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                    isSelected ? "bg-primary-muted" : "hover:bg-surface"
                  )}
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: c }}
                  >
                    <CryptoIcon symbol={h.currency} size={28} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-foreground">{n}</p>
                    <p className="text-[10px] text-muted">{h.currency}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[11px] font-medium text-foreground-secondary tabular-nums">
                      {formatCryptoAmount(h.amount)}
                    </p>
                    {h.usdValue > 0 && (
                      <p className="font-mono text-[9px] text-muted tabular-nums">{formatUsd(h.usdValue)}</p>
                    )}
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="py-4 text-center text-[11px] text-muted">No results</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
