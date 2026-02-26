"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Pencil,
  RotateCcw,
  Check,
  Palette,
  Info,
  QrCode,
  Copy,
  CheckCheck,
  X,
} from "lucide-react";

/** EMV chip icon — the metallic chip on credit cards */
function ChipIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 28" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Outer chip body */}
      <rect x="0.5" y="0.5" width="39" height="27" rx="4" stroke="currentColor" strokeWidth="1" />
      {/* Inner pad */}
      <rect x="8" y="5" width="24" height="18" rx="2" stroke="currentColor" strokeWidth="0.8" />
      {/* Horizontal lines */}
      <line x1="8" y1="11" x2="32" y2="11" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
      <line x1="8" y1="17" x2="32" y2="17" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
      {/* Vertical lines */}
      <line x1="16" y1="5" x2="16" y2="23" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
      <line x1="24" y1="5" x2="24" y2="23" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
      {/* Left contacts */}
      <line x1="0" y1="11" x2="8" y2="11" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
      <line x1="0" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
      {/* Right contacts */}
      <line x1="32" y1="11" x2="40" y2="11" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
      <line x1="32" y1="17" x2="40" y2="17" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
    </svg>
  );
}

/** Contactless / NFC payment icon — the wifi-like waves */
function ContactlessIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" style={{ transform: "rotate(90deg)" }}>
      <path d="M8.5 16.5a5.25 5.25 0 0 1 0-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 19.5a9 9 0 0 1 0-15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 13.5a1.5 1.5 0 0 1 0-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Format address like credit card number: groups of 4 with spaces */
function formatCardAddress(addr: string): string {
  // Remove 0x prefix for display
  const clean = addr.startsWith("0x") ? addr.slice(2) : addr;
  // Split into groups of 4
  return clean.match(/.{1,4}/g)?.join(" ") ?? clean;
}

interface WalletCardProps {
  totalUsd: number;
  change24h?: number;
  holdings: { currency: string; amount: number; usdValue: number }[];
  walletAddress?: string;
}

// ─── Card Themes ────────────────────────────────────────────────────────────

const CARD_THEMES = [
  {
    id: "orange",
    name: "Ember",
    bg: "linear-gradient(135deg, #ff6600 0%, #ff8533 35%, #e85d00 65%, #cc5200 100%)",
    accent: "rgba(255,255,255,0.25)",
    btnBg: "rgba(255,255,255,0.22)",
    btnBorder: "rgba(255,255,255,0.3)",
  },
  {
    id: "midnight",
    name: "Midnight",
    bg: "linear-gradient(145deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
    accent: "rgba(99,130,234,0.2)",
    btnBg: "rgba(255,255,255,0.08)",
    btnBorder: "rgba(255,255,255,0.12)",
  },
  {
    id: "aurora",
    name: "Aurora",
    bg: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    accent: "rgba(140,100,255,0.2)",
    btnBg: "rgba(255,255,255,0.08)",
    btnBorder: "rgba(255,255,255,0.12)",
  },
  {
    id: "emerald",
    name: "Emerald",
    bg: "linear-gradient(135deg, #0d4e2c 0%, #116644 40%, #0a3d22 100%)",
    accent: "rgba(34,197,94,0.2)",
    btnBg: "rgba(255,255,255,0.10)",
    btnBorder: "rgba(255,255,255,0.15)",
  },
  {
    id: "obsidian",
    name: "Obsidian",
    bg: "linear-gradient(145deg, #0a0a0a 0%, #1c1c1c 40%, #111111 100%)",
    accent: "rgba(255,255,255,0.06)",
    btnBg: "rgba(255,255,255,0.06)",
    btnBorder: "rgba(255,255,255,0.10)",
  },
  {
    id: "rose",
    name: "Rose",
    bg: "linear-gradient(135deg, #a8174e 0%, #c0245e 40%, #8b1040 100%)",
    accent: "rgba(255,100,150,0.2)",
    btnBg: "rgba(255,255,255,0.15)",
    btnBorder: "rgba(255,255,255,0.2)",
  },
] as const;

const STORAGE_KEY = "neetpay-card-theme";
const FAKE_ADDRESS = "0xAX4t2gzva6L4dKWqWVYQPhF9";

function getStoredTheme(): string {
  if (typeof window === "undefined") return "orange";
  try {
    return localStorage.getItem(STORAGE_KEY) || "orange";
  } catch {
    return "orange";
  }
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function truncateAddress(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 10)}...${addr.slice(-6)}`;
}

// ─── QR Code Modal ──────────────────────────────────────────────────────────

function QrCodeModal({ address, onClose }: { address: string; onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!modalRef.current) return;
    gsap.fromTo(modalRef.current,
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.3, ease: "power3.out" }
    );
  }, { scope: modalRef });

  // Generate a simple QR-like pattern (visual placeholder)
  const grid = 11;
  const cells: boolean[][] = [];
  for (let r = 0; r < grid; r++) {
    cells[r] = [];
    for (let c = 0; c < grid; c++) {
      // Corner markers
      const isCornerMarker =
        (r < 3 && c < 3) || (r < 3 && c >= grid - 3) || (r >= grid - 3 && c < 3);
      if (isCornerMarker) {
        const cr = r < 3 ? r : r - (grid - 3);
        const cc = c < 3 ? c : c - (grid - 3);
        cells[r][c] = cr === 0 || cr === 2 || cc === 0 || cc === 2 || (cr === 1 && cc === 1);
      } else {
        // Pseudo-random data based on address
        const charCode = address.charCodeAt((r * grid + c) % address.length);
        cells[r][c] = (charCode + r + c) % 3 !== 0;
      }
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div ref={modalRef} className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-2xl p-6 text-center" style={{
          background: "linear-gradient(160deg, #111118 0%, #16161f 50%, #111118 100%)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
        }}>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Wallet QR Code</p>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {/* QR code visual */}
          <div className="mx-auto rounded-xl bg-white p-3" style={{ width: "fit-content" }}>
            <svg viewBox={`0 0 ${grid} ${grid}`} width="160" height="160">
              {cells.map((row, r) =>
                row.map((filled, c) =>
                  filled ? (
                    <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#000" />
                  ) : null
                )
              )}
            </svg>
          </div>
          <p className="mt-3 font-mono text-[11px] text-white/50 break-all max-w-[200px] mx-auto">{address}</p>
          <p className="mt-2 text-[10px] text-white/30">Scan to receive crypto</p>
        </div>
      </div>
    </>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function WalletCard({ totalUsd, change24h = 0, holdings, walletAddress }: WalletCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardInnerRef = useRef<HTMLDivElement>(null);
  const [themeId, setThemeId] = useState("orange");
  const [isFlipped, setIsFlipped] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const isAnimating = useRef(false);

  const address = walletAddress || FAKE_ADDRESS;

  useEffect(() => {
    setThemeId(getStoredTheme());
    setMounted(true);
  }, []);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power3.out" }
      );
    },
    { scope: containerRef }
  );

  const theme = CARD_THEMES.find((t) => t.id === themeId) || CARD_THEMES[0];
  const isPositive = change24h >= 0;
  const changePct = totalUsd > 0 ? ((change24h / totalUsd) * 100).toFixed(2) : "0.00";

  const flipCard = useCallback(() => {
    if (isAnimating.current || !cardInnerRef.current) return;
    isAnimating.current = true;
    const nextFlipped = !isFlipped;

    gsap.to(cardInnerRef.current, {
      rotateY: nextFlipped ? 180 : 0,
      duration: 0.6,
      ease: "power2.inOut",
      onComplete: () => {
        isAnimating.current = false;
      },
    });

    setIsFlipped(nextFlipped);
  }, [isFlipped]);

  function selectTheme(id: string) {
    setThemeId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch { /* ignore */ }

    setTimeout(() => {
      flipCard();
    }, 250);
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <>
      <div ref={containerRef} className="relative" style={{ perspective: "1200px" }}>
        <div
          ref={cardInnerRef}
          className="relative w-full"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* ═══ FRONT FACE ═══ */}
          <div
            className="group relative select-none overflow-hidden rounded-2xl px-5 py-6"
            style={{
              background: theme.bg,
              boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
              backfaceVisibility: "hidden",
              pointerEvents: isFlipped ? "none" : "auto",
            }}
          >
            {/* Decorative orbs */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full" style={{ background: `radial-gradient(circle, ${theme.accent} 0%, transparent 70%)` }} />
            <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full" style={{ background: `radial-gradient(circle, ${theme.accent} 0%, transparent 70%)` }} />

            {/* Shimmer overlay */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{
              background: "linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.5) 38%, rgba(255,255,255,0.2) 42%, transparent 50%)",
            }} />

            {/* Edit pencil — visible on hover, triggers flip */}
            {mounted && (
              <button
                onClick={flipCard}
                className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-lg opacity-0 transition-all duration-200 group-hover:opacity-100 hover:scale-110 hover:shadow-lg active:scale-95"
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}
                aria-label="Customize card"
              >
                <Pencil className="h-3 w-3 text-white" />
              </button>
            )}

            {/* Top: neetpay brand */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="text-[11px] font-medium text-white/50">Total Balance</span>
              <span className="font-heading text-xs font-bold tracking-tight pr-8">
                <span className="text-white/50">neet</span>
                <span className="text-white/80">pay</span>
              </span>
            </div>

            {/* Balance */}
            <div className="relative z-10 mt-4">
              <p className="font-heading text-[28px] font-bold leading-none text-white tabular-nums tracking-tight">
                ${formatCurrency(totalUsd)}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{
                  background: isPositive ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                  color: isPositive ? "#4ade80" : "#f87171",
                }}>
                  {isPositive ? "+" : "-"}${Math.abs(change24h).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] font-medium" style={{ color: isPositive ? "#4ade80" : "#f87171" }}>
                  {isPositive ? "+" : ""}{changePct}%
                </span>
              </div>
            </div>

            {/* Card number (wallet address) — click to copy, with info & QR */}
            <div className="group/addr relative z-10 mt-5">
              <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/10">
                {/* Address — click to copy */}
                <button
                  onClick={(e) => { e.stopPropagation(); copyAddress(); }}
                  className="flex flex-1 items-center gap-2 cursor-pointer min-w-0"
                >
                  <span className="truncate text-left font-mono text-[11px] tracking-widest text-white/50 group-hover/addr:text-white/70 transition-colors">
                    {formatCardAddress(address)}
                  </span>
                  {copied ? (
                    <CheckCheck className="h-3 w-3 shrink-0 text-green-400" />
                  ) : (
                    <Copy className="h-3 w-3 shrink-0 text-white/30 group-hover/addr:text-white/60 transition-colors" />
                  )}
                </button>

                {/* Info button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInfo(!showInfo);
                    if (!showInfo) setTimeout(() => setShowInfo(false), 3000);
                  }}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/20"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                  aria-label="Info"
                >
                  <Info className="h-2.5 w-2.5 text-white/60" />
                </button>

                {/* QR Code button */}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowQr(true); }}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/20"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                  aria-label="QR Code"
                >
                  <QrCode className="h-2.5 w-2.5 text-white/60" />
                </button>
              </div>

              {/* Tooltip above — hover: copy hint / info: description */}
              <div className={`pointer-events-none absolute left-0 right-0 bottom-full z-30 mb-1.5 rounded-lg px-3 py-1.5 text-[10px] text-white/70 text-center transition-opacity duration-200 ${showInfo ? "opacity-100 pointer-events-auto cursor-pointer" : "opacity-0 group-hover/addr:opacity-100"}`}
                style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)" }}
                onClick={() => showInfo && setShowInfo(false)}
              >
                {showInfo
                  ? "Your neetpay wallet address. Use it to receive crypto assets directly — no fees."
                  : copied ? "Copied!" : "Wallet address — click to copy"
                }
              </div>
            </div>

            {/* Buttons */}
            <div className="relative z-10 mt-5 flex items-center gap-1.5">
              <Link href="/dashboard/wallet" className="flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-[12px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-lg active:translate-y-0 active:scale-100" style={{ background: theme.btnBg, border: `1px solid ${theme.btnBorder}`, backdropFilter: "blur(8px)" }}>
                <ArrowUpRight className="h-3 w-3" />
                Send
              </Link>
              <Link href="/dashboard/wallet" className="flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-[12px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-lg active:translate-y-0 active:scale-100" style={{ background: theme.btnBg, border: `1px solid ${theme.btnBorder}`, backdropFilter: "blur(8px)" }}>
                <ArrowDownLeft className="h-3 w-3" />
                Receive
              </Link>
              <Link href="/dashboard/wallet" className="flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-[12px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-lg active:translate-y-0 active:scale-100" style={{ background: theme.btnBg, border: `1px solid ${theme.btnBorder}`, backdropFilter: "blur(8px)" }}>
                <ArrowLeftRight className="h-3 w-3" />
                Swap
              </Link>
            </div>
          </div>

          {/* ═══ BACK FACE — Theme Picker ═══ */}
          <div
            className="absolute inset-0 select-none overflow-hidden rounded-2xl px-5 py-5"
            style={{
              background: "linear-gradient(160deg, #111118 0%, #16161f 50%, #111118 100%)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              pointerEvents: isFlipped ? "auto" : "none",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <Palette className="h-3.5 w-3.5 text-white/70" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Card Theme</p>
                  <p className="text-[10px] text-white/40">Choose your style</p>
                </div>
              </div>
              <button
                onClick={flipCard}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 hover:bg-white/10 hover:scale-110 hover:shadow-lg active:scale-95"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                aria-label="Go back"
              >
                <RotateCcw className="h-3 w-3 text-white/60" />
              </button>
            </div>

            {/* Theme grid */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {CARD_THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTheme(t.id)}
                  className="group/theme relative overflow-hidden rounded-xl p-2.5 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  style={{
                    background: t.bg,
                    border: themeId === t.id ? "2px solid rgba(255,255,255,0.5)" : "2px solid transparent",
                  }}
                >
                  {themeId === t.id && (
                    <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white">
                      <Check className="h-2.5 w-2.5 text-black" />
                    </div>
                  )}
                  <p className="text-[9px] font-semibold text-white/90">{t.name}</p>
                  <div className="mt-1.5 flex gap-1">
                    <div className="h-0.5 w-4 rounded-full bg-white/30" />
                    <div className="h-0.5 w-3 rounded-full bg-white/20" />
                    <div className="h-0.5 w-2 rounded-full bg-white/10" />
                  </div>
                </button>
              ))}
            </div>

            {/* Decorative bottom text */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="h-px flex-1 bg-white/10" />
              <span className="font-heading text-[9px] tracking-wider text-white/20">NEETPAY</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQr && <QrCodeModal address={address} onClose={() => setShowQr(false)} />}
    </>
  );
}
