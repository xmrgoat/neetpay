import Link from "next/link";

function TerminalShowcase() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#08080c]">
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
        {/* Top — system status */}
        <div>
          <div className="flex items-center gap-2 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="font-mono text-[10px] text-[#444] uppercase tracking-widest">
              neetpay system status — operational
            </span>
          </div>

          {/* Terminal block — API response mockup */}
          <div className="rounded-xl border border-[#1a1a22] bg-[#0c0c10] overflow-hidden max-w-md">
            <div className="flex items-center gap-2 border-b border-[#1a1a22] px-4 py-2.5">
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-[#2a2a32]" />
                <div className="h-2 w-2 rounded-full bg-[#2a2a32]" />
                <div className="h-2 w-2 rounded-full bg-[#2a2a32]" />
              </div>
              <span className="font-mono text-[10px] text-[#444]">
                POST /v1/payment — 200 OK
              </span>
            </div>
            <div className="p-4 font-mono text-[11px] leading-6">
              <div className="text-[#555]">{"{"}</div>
              <div className="pl-4">
                <span className="text-[#777]">&quot;id&quot;</span>
                <span className="text-[#444]">: </span>
                <span className="text-[#888]">&quot;np_7x9k2m4f&quot;</span>
                <span className="text-[#444]">,</span>
              </div>
              <div className="pl-4">
                <span className="text-[#777]">&quot;status&quot;</span>
                <span className="text-[#444]">: </span>
                <span className="text-emerald-500/70">&quot;awaiting_payment&quot;</span>
                <span className="text-[#444]">,</span>
              </div>
              <div className="pl-4">
                <span className="text-[#777]">&quot;amount&quot;</span>
                <span className="text-[#444]">: </span>
                <span className="text-[#ff6600]/60">29.99</span>
                <span className="text-[#444]">,</span>
              </div>
              <div className="pl-4">
                <span className="text-[#777]">&quot;currency&quot;</span>
                <span className="text-[#444]">: </span>
                <span className="text-[#ff6600]/60">&quot;USD&quot;</span>
                <span className="text-[#444]">,</span>
              </div>
              <div className="pl-4">
                <span className="text-[#777]">&quot;payment_url&quot;</span>
                <span className="text-[#444]">: </span>
                <span className="text-[#555]">&quot;https://pay.neetpay...&quot;</span>
              </div>
              <div className="text-[#555]">{"}"}</div>
            </div>
          </div>
        </div>

        {/* Middle — feature params */}
        <div className="space-y-4 my-10">
          {[
            { key: "transaction_fees", value: "0%", note: "flat rate, not percentage" },
            { key: "kyc_required", value: "false", note: "email-only signup" },
            { key: "custody_model", value: "non-custodial", note: "direct to your wallet" },
            { key: "chains_supported", value: "5", note: "EVM, SOL, BTC, TRON, XMR" },
            { key: "integration_time", value: "< 5min", note: "single REST endpoint" },
          ].map((param) => (
            <div key={param.key} className="flex items-baseline gap-3">
              <span className="font-mono text-[11px] text-[#444] min-w-[160px]">
                {param.key}
              </span>
              <span className="font-mono text-[12px] text-[#ccc] font-medium">
                {param.value}
              </span>
              <span className="font-mono text-[10px] text-[#333]">
                // {param.note}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom — tagline */}
        <div>
          <div className="h-px w-16 bg-[#1a1a22] mb-6" />
          <p className="font-mono text-[10px] text-[#333] uppercase tracking-[0.2em]">
            permissionless payments infrastructure
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-background">
      {/* Left — form side */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 md:w-1/2 lg:w-[45%]">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-10 inline-block font-heading text-xl font-bold tracking-tight"
          >
            <span className="text-foreground">neet</span>
            <span className="text-primary">pay</span>
          </Link>

          {children}
        </div>
      </div>

      {/* Right — terminal showcase (hidden on mobile) */}
      <div className="hidden border-l border-[#1a1a22] md:block md:w-1/2 lg:w-[55%]">
        <TerminalShowcase />
      </div>
    </div>
  );
}
