"use client";

import { SUPPORTED_CRYPTOS } from "@/lib/constants";

/* ─── Brand colors per crypto ──────────────────────────── */
const CRYPTO_COLORS: Record<string, string> = {
  BTC: "#F7931A",
  ETH: "#627EEA",
  XMR: "#FF6600",
  SOL: "#9945FF",
  USDT: "#26A17B",
  USDC: "#2775CA",
  TRX: "#FF0013",
  BNB: "#F3BA2F",
  LTC: "#345D9D",
  DOGE: "#C2A633",
  TON: "#0098EA",
  XRP: "#23292F",
};

/* ─── SVG icon components (inline, no external deps) ───── */

function BtcIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#F7931A" />
      <path
        d="M22.5 14.2c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.7c-.3-.1-.7-.2-1-.3l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 0 .1 0 .1 0l-.1 0-1.1 4.5c-.1.2-.3.5-.7.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.7c.5.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2.1 0-3.3-1.5-4.1 1.1-.3 1.9-1 2.1-2.5zm-3.7 5.2c-.5 2.1-4.1 1-5.3.7l.9-3.8c1.2.3 4.9.9 4.4 3.1zm.5-5.3c-.5 1.9-3.5.9-4.4.7l.9-3.4c1 .2 4 .7 3.5 2.7z"
        fill="white"
      />
    </svg>
  );
}

function EthIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#627EEA" />
      <path d="M16.5 4v8.9l7.5 3.3L16.5 4z" fill="white" fillOpacity="0.6" />
      <path d="M16.5 4L9 16.2l7.5-3.3V4z" fill="white" />
      <path d="M16.5 21.9v6.1l7.5-10.4-7.5 4.3z" fill="white" fillOpacity="0.6" />
      <path d="M16.5 28v-6.1L9 17.6l7.5 10.4z" fill="white" />
      <path d="M16.5 20.6l7.5-4.4-7.5-3.3v7.7z" fill="white" fillOpacity="0.2" />
      <path d="M9 16.2l7.5 4.4v-7.7L9 16.2z" fill="white" fillOpacity="0.6" />
    </svg>
  );
}

function XmrIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#FF6600" />
      <path d="M16 6.5l-7.5 7.5v7h3.5v-5.5L16 11.5l4 4V21h3.5v-7L16 6.5z" fill="white" />
      <path d="M6 21h4v4H6zM22 21h4v4h-4z" fill="white" fillOpacity="0.6" />
    </svg>
  );
}

function SolIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#000" />
      <defs>
        <linearGradient id="sol-g" x1="7" y1="24" x2="25" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9945FF" />
          <stop offset="0.5" stopColor="#19FB9B" />
          <stop offset="1" stopColor="#00D1FF" />
        </linearGradient>
      </defs>
      <path d="M9 20.5l1.5-1.5h13l-1.5 1.5H9zM9 11.5l1.5 1.5h13L22 11.5H9zM9 16h14.5l-1.5 1.5H10.5L9 16z" fill="url(#sol-g)" />
    </svg>
  );
}

function UsdtIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <path d="M17.9 17.1v0c-.1 0-.7.1-2 .1-1 0-1.6 0-1.9-.1v0C11.1 16.8 9 16.2 9 15.5s2.1-1.3 5-1.5v2.4c.3 0 .9.1 2 .1 1.3 0 1.7-.1 1.9-.1v-2.4c2.8.2 5 .8 5 1.5s-2.1 1.3-4.9 1.5zM17.9 13.8v-2.1h5.8V8H8.3v3.6h5.8v2.1c-3.3.2-5.8 1-5.8 2.1 0 1.1 2.5 1.9 5.8 2.1v7.5h3.8v-7.5c3.3-.2 5.7-1 5.7-2.1 0-1.1-2.5-1.9-5.7-2.1z" fill="white" />
    </svg>
  );
}

function UsdcIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#2775CA" />
      <path d="M20.6 18.4c0-1.7-1-2.3-3.1-2.6-1.5-.2-1.8-.5-1.8-1.1s.5-.9 1.5-.9c.9 0 1.3.3 1.5.9.1.1.2.2.3.2h.7c.2 0 .3-.1.3-.3v0c-.2-.9-.8-1.6-1.8-1.8V12c0-.2-.1-.3-.3-.3h-.7c-.2 0-.3.1-.3.3v.8c-1.3.2-2.2 1-2.2 2.1 0 1.6 1 2.3 3.1 2.5 1.4.3 1.8.5 1.8 1.2 0 .7-.6 1.1-1.6 1.1-1.2 0-1.6-.5-1.7-1.1 0-.1-.2-.2-.3-.2h-.8c-.2 0-.3.1-.3.3.2 1 .9 1.7 2.1 1.9V20c0 .2.1.3.3.3h.7c.2 0 .3-.1.3-.3v-.8c1.4-.1 2.3-1 2.3-2.2z" fill="white" />
      <path d="M13.3 23c-3.7-1.3-5.6-5.4-4.3-9.2 .7-1.9 2.2-3.4 4.3-4.1.2 0 .3-.2.3-.3V8.8c0-.2-.1-.3-.3-.3-4.5 1.3-7.1 6-5.8 10.5 .8 2.7 2.9 4.9 5.6 5.7.2.1.4 0 .4-.2v-.6c.1-.2 0-.4-.2-.5zM18.7 8.5c-.2-.1-.3 0-.3.2v.6c0 .2.1.3.3.4 3.7 1.3 5.6 5.4 4.3 9.2-.7 1.9-2.2 3.4-4.3 4.1-.2 0-.3.2-.3.3v.6c0 .2.1.3.3.3 4.5-1.3 7.1-6 5.8-10.5-.8-2.7-2.9-4.9-5.8-5.7z" fill="white" />
    </svg>
  );
}

function TrxIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#FF0013" />
      <path d="M8 9l13.4 1.8L16.2 26 8 9zm2.4 1.4l5 12.2 3.7-10.6-8.7-1.6zm9.3 1.1l-3.3 9.2 7-7.4-3.7-1.8z" fill="white" />
    </svg>
  );
}

function BnbIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
      <path d="M12.1 14.4L16 10.5l3.9 3.9 2.3-2.3L16 5.9l-6.2 6.2 2.3 2.3zM5.9 16l2.3-2.3L10.5 16l-2.3 2.3L5.9 16zM12.1 17.6L16 21.5l3.9-3.9 2.3 2.3L16 26.1l-6.2-6.2 2.3-2.3zM21.5 16l2.3-2.3L26.1 16l-2.3 2.3L21.5 16zM18.4 16L16 13.6 13.6 16 16 18.4 18.4 16z" fill="white" />
    </svg>
  );
}

function LtcIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#345D9D" />
      <path d="M16 6l-1.5 10.5-3.5 1.5.5-1.5L15 6h-4l-3 15h-2l-.5 2h2L7 25h18l.5-2h-10l1.5-5 3.5-1.5-.5 1.5L16 6z" fill="white" />
    </svg>
  );
}

function DogeIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#C2A633" />
      <path d="M13 10h4c4 0 6.5 2.5 6.5 6s-2.5 6-6.5 6h-4V10zm2.5 2.5v7h1.5c2.3 0 3.8-1.5 3.8-3.5s-1.5-3.5-3.8-3.5h-1.5z" fill="white" />
      <path d="M10 15h7v2h-7z" fill="white" />
    </svg>
  );
}

function TonIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#0098EA" />
      <path d="M10.5 10h11l-5.5 15-5.5-15zm1.8 1.5L16 22l3.7-10.5H12.3z" fill="white" />
    </svg>
  );
}

function XrpIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#23292F" />
      <path d="M10 8h2.4l3.6 4.5L19.6 8H22l-5 6.2L22 20.5h-2.4L16 16l-3.6 4.5H10l5-6.3L10 8zM10 24h2.4L16 19.5 19.6 24H22l-6-7.5L10 24z" fill="white" />
    </svg>
  );
}

const CRYPTO_ICON_MAP: Record<string, React.FC> = {
  BTC: BtcIcon,
  ETH: EthIcon,
  XMR: XmrIcon,
  SOL: SolIcon,
  USDT: UsdtIcon,
  USDC: UsdcIcon,
  TRX: TrxIcon,
  BNB: BnbIcon,
  LTC: LtcIcon,
  DOGE: DogeIcon,
  TON: TonIcon,
  XRP: XrpIcon,
};

/* ─── Single crypto item in marquee ────────────────────── */
function CryptoItem({ symbol, name }: { symbol: string; name: string }) {
  const Icon = CRYPTO_ICON_MAP[symbol];

  return (
    <div className="flex items-center px-4 shrink-0 select-none">
      <div
        className="flex items-center gap-4 rounded-full px-6 py-4"
        style={{
          background: "rgba(8, 8, 12, 0.6)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {/* Round icon */}
        <div className="h-12 w-12 shrink-0 rounded-full overflow-hidden">
          {Icon ? (
            <Icon />
          ) : (
            <div
              className="w-full h-full rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: CRYPTO_COLORS[symbol] || "#555" }}
            >
              {symbol.slice(0, 2)}
            </div>
          )}
        </div>
        <span className="text-lg font-semibold text-white/90 whitespace-nowrap">
          {name}
        </span>
      </div>
    </div>
  );
}

/* ─── Marquee section ──────────────────────────────────── */
export function SocialProofBar() {
  const items = [...SUPPORTED_CRYPTOS, ...SUPPORTED_CRYPTOS, ...SUPPORTED_CRYPTOS, ...SUPPORTED_CRYPTOS];

  return (
    <section className="py-10 overflow-hidden">
      <p className="text-center text-[10px] font-medium uppercase tracking-[0.2em] text-white/40 mb-8">
        18+ cryptocurrencies across 5 chains
      </p>

      {/* Marquee with edge blur masks */}
      <div
        className="relative"
        style={{
          maskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
        }}
      >
        <div className="flex items-center animate-marquee">
          {items.map((crypto, i) => (
            <CryptoItem key={`${crypto.symbol}-${i}`} symbol={crypto.symbol} name={crypto.name} />
          ))}
        </div>
      </div>
    </section>
  );
}
