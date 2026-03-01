"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ArrowLeftRight,
  Percent,
  DollarSign,
  Link as LinkIcon,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  payments: number;
  paymentsChange: number;
  conversionRate: number;
  avgPayment: number;
  avgChange: number;
  activeLinks: number;
  sparklines: {
    paymentCounts: number[];
    conversionRates: number[];
    avgPayments: number[];
    activeLinkCounts: number[];
  };
}

// ─── Sparkline with gradient fill ───────────────────────────────────────────

function Sparkline({ data, id }: { data: number[]; id: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 72;
  const h = 28;
  const pad = 1;

  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: pad + (1 - (v - min) / range) * (h - pad * 2),
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0 opacity-60 transition-opacity duration-300 group-hover:opacity-100"
    >
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${id})`} />
      <path
        d={linePath}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.5"
      />
      {/* End dot */}
      <circle
        cx={pts[pts.length - 1].x}
        cy={pts[pts.length - 1].y}
        r="2"
        fill="var(--primary)"
        opacity="0.7"
      />
    </svg>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function OverviewKpis({
  payments,
  paymentsChange,
  conversionRate,
  avgPayment,
  avgChange,
  activeLinks,
  sparklines,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const tl = gsap.timeline({
        onComplete() {
          if (!ref.current) return;
          gsap.set(ref.current.children, { clearProps: "transform,opacity" });
        },
      });
      tl.fromTo(
        ref.current.children,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.07, ease: "power3.out" }
      );
    },
    { scope: ref }
  );

  const items = [
    {
      label: "Total Payments",
      value: payments.toLocaleString(),
      change: paymentsChange,
      icon: ArrowLeftRight,
      sparkline: sparklines.paymentCounts,
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      change: null as number | null,
      icon: Percent,
      sparkline: sparklines.conversionRates,
    },
    {
      label: "Avg. Payment",
      value: `$${avgPayment}`,
      change: avgChange,
      icon: DollarSign,
      sparkline: sparklines.avgPayments,
    },
    {
      label: "Active Links",
      value: activeLinks.toString(),
      change: null as number | null,
      icon: LinkIcon,
      sparkline: sparklines.activeLinkCounts,
    },
  ];

  return (
    <div ref={ref} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item, i) => (
        <div
          key={item.label}
          className="group relative overflow-hidden rounded-xl border border-border bg-background p-4 transition-all duration-300 hover:border-border-hover"
        >
          {/* Label */}
          <div className="flex items-center gap-2 mb-3">
            <item.icon className="h-3.5 w-3.5 text-muted" />
            <p className="text-[11px] font-medium text-muted tracking-wide uppercase">
              {item.label}
            </p>
          </div>

          {/* Value row */}
          <div className="flex items-end justify-between">
            <div>
              <p className="font-heading text-2xl font-bold tabular-nums text-foreground leading-none">
                {item.value}
              </p>
              {item.change !== null && (
                <div className="mt-2 flex items-center gap-1">
                  <div
                    className={cn(
                      "flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                      item.change > 0
                        ? "bg-success/10 text-success"
                        : item.change < 0
                          ? "bg-error/10 text-error"
                          : "bg-surface text-muted"
                    )}
                  >
                    {item.change > 0 ? (
                      <TrendingUp className="h-2.5 w-2.5" />
                    ) : (
                      <TrendingDown className="h-2.5 w-2.5" />
                    )}
                    {item.change > 0 ? "+" : ""}
                    {item.change}%
                  </div>
                  <span className="text-[9px] text-muted">vs last period</span>
                </div>
              )}
              {item.change === null && <div className="h-[22px]" />}
            </div>

            {/* Sparkline */}
            <Sparkline data={item.sparkline} id={`kpi-${i}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
