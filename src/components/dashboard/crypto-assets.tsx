"use client";

import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CRYPTO_COLORS } from "@/lib/constants";
import Link from "next/link";
import {
  ChevronRight, X, TrendingUp, TrendingDown, Search,
  Settings2, EyeOff, ArrowUpDown, BarChart3, Hash, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CryptoAsset {
  currency: string;
  amount: number;
  usdValue: number;
  price?: number;
  change24h?: number;
}

interface CryptoAssetsProps {
  holdings: CryptoAsset[];
}

const CRYPTO_NAMES: Record<string, string> = {
  BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", XMR: "Monero",
  USDT: "Tether", USDC: "USD Coin", TRX: "Tron", BNB: "BNB",
  LTC: "Litecoin", DOGE: "Dogecoin", TON: "Toncoin", XRP: "Ripple",
  AVAX: "Avalanche", ARB: "Arbitrum", OP: "Optimism", MATIC: "Polygon",
};

const CRYPTO_PAIRS: Record<string, string> = {
  BTC: "BTC/USDT", ETH: "ETH/USDT", SOL: "SOL/USDT", XMR: "XMR/USDT",
  USDT: "USDT/USD", USDC: "USDC/USD", TRX: "TRX/USDT", BNB: "BNB/USDT",
  LTC: "LTC/USDT", DOGE: "DOGE/USDT", TON: "TON/USDT", XRP: "XRP/USDT",
  AVAX: "AVAX/USDT", ARB: "ARB/USDT", OP: "OP/USDT", MATIC: "MATIC/USDT",
};

const CRYPTO_ICONS: Record<string, string> = {
  BTC: "₿", ETH: "Ξ", SOL: "◎", XMR: "ɱ",
  USDT: "₮", USDC: "$", TRX: "◈", BNB: "◆",
  LTC: "Ł", DOGE: "Ð", TON: "◇", XRP: "✕",
  AVAX: "▲", ARB: "◬", OP: "⬡", MATIC: "◈",
};

type SortMode = "value" | "name" | "change" | "default";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "default", label: "Par défaut" },
  { value: "value", label: "Par valeur" },
  { value: "name", label: "Par nom" },
  { value: "change", label: "Par variation" },
];

const SETTINGS_KEY = "neetpay-assets-settings";

interface AssetsSettings {
  hideZeroBalance: boolean;
  sortBy: SortMode;
  showSparklines: boolean;
  showPortfolioPct: boolean;
  compactMode: boolean;
}

const DEFAULT_SETTINGS: AssetsSettings = {
  hideZeroBalance: false,
  sortBy: "default",
  showSparklines: true,
  showPortfolioPct: true,
  compactMode: false,
};

function loadSettings(): AssetsSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: AssetsSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

function formatCryptoAmount(amount: number): string {
  if (amount >= 1_000) return amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (amount >= 1) return amount.toFixed(4);
  if (amount >= 0.001) return amount.toFixed(6);
  return amount.toFixed(8);
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function generateMiniSparkline(isPositive: boolean, seed: number): string {
  const points: number[] = [];
  let y = 50;
  for (let i = 0; i <= 12; i++) {
    const pseudo = Math.sin(seed * 13.37 + i * 2.71) * 0.5 + 0.5;
    y += (pseudo - (isPositive ? 0.4 : 0.6)) * 10;
    y = Math.max(10, Math.min(90, y));
    points.push(y);
  }
  if (isPositive) {
    points[points.length - 1] = Math.min(points[0] - 8, 35);
  } else {
    points[points.length - 1] = Math.max(points[0] + 8, 65);
  }
  const w = 60;
  const step = w / (points.length - 1);
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${p.toFixed(1)}`).join(" ");
}

function generateSparkline(isPositive: boolean): string {
  const points: number[] = [];
  let y = 50;
  for (let i = 0; i <= 20; i++) {
    y += (Math.random() - (isPositive ? 0.4 : 0.6)) * 12;
    y = Math.max(10, Math.min(90, y));
    points.push(y);
  }
  if (isPositive) {
    points[points.length - 1] = Math.min(points[0] - 10, 30);
  } else {
    points[points.length - 1] = Math.max(points[0] + 10, 70);
  }
  const w = 280;
  const step = w / (points.length - 1);
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${p}`).join(" ");
}

// ─── Settings Panel ─────────────────────────────────────────────────────────

function SettingsPanel({
  settings,
  onChange,
  onClose,
}: {
  settings: AssetsSettings;
  onChange: (s: AssetsSettings) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!panelRef.current) return;
    gsap.fromTo(panelRef.current,
      { opacity: 0, y: -8, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: "power3.out" }
    );
  }, { scope: panelRef });

  function toggle(key: keyof AssetsSettings) {
    const next = { ...settings, [key]: !settings[key] };
    onChange(next);
  }

  function setSortBy(v: SortMode) {
    const next = { ...settings, sortBy: v };
    onChange(next);
  }

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        ref={panelRef}
        className="absolute right-0 top-full z-40 mt-1.5 w-56 rounded-xl border border-border bg-background p-1"
        style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)" }}
      >
        {/* Sort */}
        <div className="px-3 pt-2.5 pb-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted/60">Trier par</p>
        </div>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSortBy(opt.value)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] transition-colors",
              settings.sortBy === opt.value
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground-secondary hover:bg-surface/80"
            )}
          >
            <ArrowUpDown className="h-3 w-3 shrink-0" />
            {opt.label}
          </button>
        ))}

        <div className="mx-3 my-1.5 h-px bg-border/40" />

        {/* Toggles */}
        <div className="px-3 pt-1 pb-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted/60">Affichage</p>
        </div>

        <ToggleRow
          icon={<EyeOff className="h-3 w-3" />}
          label="Masquer solde à 0"
          active={settings.hideZeroBalance}
          onToggle={() => toggle("hideZeroBalance")}
        />
        <ToggleRow
          icon={<BarChart3 className="h-3 w-3" />}
          label="Sparklines"
          active={settings.showSparklines}
          onToggle={() => toggle("showSparklines")}
        />
        <ToggleRow
          icon={<Hash className="h-3 w-3" />}
          label="% du portfolio"
          active={settings.showPortfolioPct}
          onToggle={() => toggle("showPortfolioPct")}
        />
        <ToggleRow
          icon={<ChevronDown className="h-3 w-3" />}
          label="Mode compact"
          active={settings.compactMode}
          onToggle={() => toggle("compactMode")}
        />

        <div className="h-1" />
      </div>
    </>
  );
}

function ToggleRow({
  icon,
  label,
  active,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] text-foreground-secondary hover:bg-surface/80 transition-colors"
    >
      <span className="shrink-0 text-muted">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {/* Toggle pill */}
      <div
        className={cn(
          "relative h-4 w-7 rounded-full transition-colors duration-200",
          active ? "bg-primary" : "bg-border"
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200",
            active ? "translate-x-3.5" : "translate-x-0.5"
          )}
        />
      </div>
    </button>
  );
}

// ─── Detail Card (overlay) ──────────────────────────────────────────────────

function CryptoDetailCard({ asset, onClose }: { asset: CryptoAsset; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const color = CRYPTO_COLORS[asset.currency.toUpperCase()] ?? "#737373";
  const name = CRYPTO_NAMES[asset.currency.toUpperCase()] ?? asset.currency;
  const pair = CRYPTO_PAIRS[asset.currency.toUpperCase()] ?? `${asset.currency}/USD`;
  const icon = CRYPTO_ICONS[asset.currency.toUpperCase()] ?? asset.currency.slice(0, 1);
  const change = asset.change24h ?? 0;
  const isPositive = change >= 0;
  const sparkline = generateSparkline(isPositive);

  useGSAP(
    () => {
      if (!cardRef.current) return;
      gsap.fromTo(cardRef.current,
        { opacity: 0, scale: 0.92, y: 12 },
        { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: "power3.out" }
      );
    },
    { scope: cardRef }
  );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div ref={cardRef} className="fixed left-1/2 top-1/2 z-50 w-[340px] -translate-x-1/2 -translate-y-1/2">
        <div
          className="relative overflow-hidden rounded-2xl p-6"
          style={{
            background: "linear-gradient(160deg, #111118 0%, #16161f 50%, #111118 100%)",
            boxShadow: `0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06), 0 0 40px ${color}15`,
          }}
        >
          <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-muted hover:text-foreground hover:bg-white/10 transition-colors">
            <X className="h-4 w-4" />
          </button>

          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20" style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }} />

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: `${color}20`, border: `1px solid ${color}30` }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: color, boxShadow: `0 4px 12px ${color}50` }}>
                <span className="text-sm font-bold text-white">{icon}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted">{pair}</p>
              <p className="text-base font-semibold text-white">{name}</p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs text-muted">Price</p>
            <p className="mt-1 font-heading text-[28px] font-bold text-white tabular-nums tracking-tight">
              ${(asset.price ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {isPositive ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-error" />}
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${isPositive ? "bg-success/15 text-success" : "bg-error/15 text-error"}`}>
                {isPositive ? "+" : ""}{change.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <svg viewBox="0 0 280 100" className="h-28 w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id={`grad-${asset.currency}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <path d={`${sparkline} L 280 100 L 0 100 Z`} fill={`url(#grad-${asset.currency})`} />
              <path d={sparkline} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="280" cy={sparkline.split(" ").slice(-1)[0]} r="4" fill={color} stroke="#111118" strokeWidth="2" />
            </svg>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted">Your balance</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-white tabular-nums">
                {formatCryptoAmount(asset.amount)} {asset.currency}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted">Value</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-white tabular-nums">
                {formatUsd(asset.usdValue)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CryptoAssets({ holdings }: CryptoAssetsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedAsset, setSelectedAsset] = useState<CryptoAsset | null>(null);
  const [search, setSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AssetsSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setMounted(true);
  }, []);

  const updateSettings = useCallback((next: AssetsSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      const rows = containerRef.current.querySelectorAll("[data-asset-row]");
      if (!rows.length) return;
      gsap.fromTo(rows, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.04, ease: "power2.out", delay: 0.2 });
    },
    { scope: containerRef }
  );

  const processed = useMemo(() => {
    let list = [...holdings];

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => {
        const name = CRYPTO_NAMES[a.currency.toUpperCase()] ?? a.currency;
        return a.currency.toLowerCase().includes(q) || name.toLowerCase().includes(q);
      });
    }

    // Hide zero balance
    if (settings.hideZeroBalance) {
      list = list.filter((a) => a.amount > 0);
    }

    // Sort
    switch (settings.sortBy) {
      case "value":
        list.sort((a, b) => b.usdValue - a.usdValue);
        break;
      case "name":
        list.sort((a, b) => {
          const na = CRYPTO_NAMES[a.currency.toUpperCase()] ?? a.currency;
          const nb = CRYPTO_NAMES[b.currency.toUpperCase()] ?? b.currency;
          return na.localeCompare(nb);
        });
        break;
      case "change":
        list.sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0));
        break;
    }

    return list;
  }, [holdings, search, settings.hideZeroBalance, settings.sortBy]);

  const totalValue = holdings.reduce((sum, a) => sum + a.usdValue, 0);

  // Count active settings (non-default)
  const activeSettingsCount = [
    settings.hideZeroBalance !== DEFAULT_SETTINGS.hideZeroBalance,
    settings.sortBy !== DEFAULT_SETTINGS.sortBy,
    settings.showSparklines !== DEFAULT_SETTINGS.showSparklines,
    settings.showPortfolioPct !== DEFAULT_SETTINGS.showPortfolioPct,
    settings.compactMode !== DEFAULT_SETTINGS.compactMode,
  ].filter(Boolean).length;

  if (holdings.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-background px-5 py-8 text-center">
        <p className="text-xs text-muted">No assets yet</p>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="rounded-xl border border-border bg-background overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-[13px] font-semibold text-foreground">Solde des actifs</h3>
          <div className="flex items-center gap-2">
            {/* Settings button */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md transition-all duration-200 hover:scale-110 active:scale-95",
                  showSettings
                    ? "bg-primary/15 text-primary"
                    : "text-muted hover:text-foreground hover:bg-surface"
                )}
              >
                <Settings2 className="h-3.5 w-3.5" />
                {/* Badge for active settings */}
                {mounted && activeSettingsCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[7px] font-bold text-white">
                    {activeSettingsCount}
                  </span>
                )}
              </button>

              {showSettings && (
                <SettingsPanel
                  settings={settings}
                  onChange={updateSettings}
                  onClose={() => setShowSettings(false)}
                />
              )}
            </div>

            <Link href="/dashboard/wallet" className="flex items-center gap-0.5 text-[11px] text-muted hover:text-foreground transition-colors">
              All <ChevronRight size={12} />
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-surface/50 px-3 py-1.5">
            <Search className="h-3 w-3 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-[12px] text-foreground placeholder:text-muted/60 outline-none"
            />
          </div>
        </div>

        {/* Asset rows */}
        <div>
          {processed.map((asset, i) => {
            const color = CRYPTO_COLORS[asset.currency.toUpperCase()] ?? "#737373";
            const name = CRYPTO_NAMES[asset.currency.toUpperCase()] ?? asset.currency;
            const icon = CRYPTO_ICONS[asset.currency.toUpperCase()] ?? asset.currency.slice(0, 1);
            const change = asset.change24h ?? 0;
            const isPositive = change >= 0;
            const isLast = i === processed.length - 1;
            const pct = totalValue > 0 ? (asset.usdValue / totalValue) * 100 : 0;
            const sparkline = generateMiniSparkline(isPositive, asset.currency.charCodeAt(0));
            const isZero = asset.amount === 0;

            return (
              <button
                key={asset.currency}
                data-asset-row
                onClick={() => setSelectedAsset(asset)}
                className={cn(
                  "group/row flex w-full items-center gap-3 px-4 text-left transition-all duration-200 hover:bg-surface/80 cursor-pointer",
                  !isLast && "border-b border-border/30",
                  settings.compactMode ? "py-2" : "py-3",
                  isZero && "opacity-50 hover:opacity-80"
                )}
              >
                {/* Icon */}
                <div className="relative shrink-0">
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full transition-shadow duration-200 group-hover/row:shadow-lg",
                      settings.compactMode ? "h-7 w-7" : "h-9 w-9"
                    )}
                    style={{
                      backgroundColor: color,
                      boxShadow: `0 2px 8px ${color}35`,
                    }}
                  >
                    <span className={cn("font-bold text-white", settings.compactMode ? "text-[10px]" : "text-xs")}>{icon}</span>
                  </div>
                  <div
                    className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-200 group-hover/row:opacity-100"
                    style={{ boxShadow: `0 0 0 2px ${color}25, 0 0 12px ${color}20` }}
                  />
                </div>

                {/* Name + price + change */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className={cn("font-semibold text-foreground", settings.compactMode ? "text-[12px]" : "text-[13px]")}>{name}</p>
                    <span className="text-[10px] text-muted/50 font-mono">{asset.currency}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {asset.price !== undefined && (
                      <span className="text-[11px] text-muted tabular-nums font-mono">
                        ${asset.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      </span>
                    )}
                    <span className={`text-[11px] font-semibold ${isPositive ? "text-success" : "text-error"}`}>
                      {isPositive ? "+" : ""}{change.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Mini sparkline */}
                {settings.showSparklines && (
                  <div className="hidden sm:block shrink-0 w-[60px] h-[28px] opacity-50 group-hover/row:opacity-80 transition-opacity">
                    <svg viewBox="0 0 60 100" className="h-full w-full" preserveAspectRatio="none">
                      <path
                        d={sparkline}
                        fill="none"
                        stroke={isPositive ? "#22c55e" : "#ef4444"}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}

                {/* Amount + USD + portfolio % */}
                <div className="shrink-0 text-right">
                  <p className={cn("font-mono font-semibold text-foreground tabular-nums", settings.compactMode ? "text-[12px]" : "text-[13px]")}>
                    {formatCryptoAmount(asset.amount)} <span className="text-[10px] text-muted font-normal">{asset.currency}</span>
                  </p>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    <span className="font-mono text-[11px] text-muted tabular-nums">
                      {formatUsd(asset.usdValue)}
                    </span>
                    {settings.showPortfolioPct && (
                      <span className="text-[9px] text-muted/40 tabular-nums">
                        {pct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {processed.length === 0 && (
            <div className="px-4 py-6 text-center text-[12px] text-muted">
              {settings.hideZeroBalance ? "Aucun actif avec un solde" : "Aucun actif trouvé"}
            </div>
          )}
        </div>
      </div>

      {selectedAsset && (
        <CryptoDetailCard asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
      )}
    </>
  );
}
