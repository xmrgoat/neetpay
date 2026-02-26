"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ArrowLeftRight,
  Percent,
  DollarSign,
  Link as LinkIcon,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  payments: number;
  paymentsChange: number;
  conversionRate: number;
  avgPayment: number;
  avgChange: number;
  activeLinks: number;
}

// ─── Mini Charts for collapsed state ────────────────────────────────────────

/** Mini bar chart — like "Open vulnerabilities" in reference */
function MiniBarChartInline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-[2px] h-7">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-[3px] rounded-sm"
          style={{
            height: `${Math.max(12, (v / max) * 100)}%`,
            backgroundColor: color,
            opacity: 0.35 + (i / data.length) * 0.65,
          }}
        />
      ))}
    </div>
  );
}

/** Donut / arc chart — like "Active incidents" in reference */
function MiniDonutChart({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(value / max, 1);
  const r = 11;
  const circumference = 2 * Math.PI * r;
  const dash = pct * circumference;
  return (
    <div className="relative flex h-7 w-7 items-center justify-center">
      <svg viewBox="0 0 28 28" className="h-7 w-7 -rotate-90">
        {/* Background track */}
        <circle cx="14" cy="14" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/[0.06]" />
        {/* Progress arc */}
        <circle
          cx="14" cy="14" r={r}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <span className="absolute text-[7px] font-bold tabular-nums" style={{ color }}>{Math.round(pct * 100)}%</span>
    </div>
  );
}

/** Semi-circular gauge — like "Compliance score" in reference */
function MiniGaugeChart({ value, color }: { value: number; color: string }) {
  const pct = Math.min(value / 100, 1);
  const r = 12;
  const halfCircumference = Math.PI * r;
  const dash = pct * halfCircumference;
  return (
    <div className="relative flex h-7 w-7 items-center justify-center">
      <svg viewBox="0 0 30 18" className="h-7 w-7">
        {/* Background arc */}
        <path
          d="M 3 16 A 12 12 0 0 1 27 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="text-white/[0.06]"
        />
        {/* Progress arc */}
        <path
          d="M 3 16 A 12 12 0 0 1 27 16"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${halfCircumference}`}
        />
      </svg>
    </div>
  );
}

/** Candlestick chart — like "Time to remediate" in reference */
function MiniCandlestickChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-center gap-[2px] h-7">
      {data.map((v, i) => {
        const h = Math.max(15, (v / max) * 100);
        const isUp = i === 0 ? true : data[i] >= data[i - 1];
        return (
          <div key={i} className="flex flex-col items-center justify-end h-full">
            {/* Wick */}
            <div
              className="w-[1px] rounded-full"
              style={{
                height: `${h * 0.3}%`,
                backgroundColor: color,
                opacity: 0.3,
              }}
            />
            {/* Body */}
            <div
              className="w-[3px] rounded-sm"
              style={{
                height: `${h * 0.7}%`,
                backgroundColor: isUp ? color : `${color}80`,
                opacity: 0.4 + (i / data.length) * 0.6,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Mini bar chart for the expanded section ────────────────────────────────

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-[3px] h-10">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all duration-300"
          style={{
            height: `${(v / max) * 100}%`,
            backgroundColor: color,
            opacity: 0.3 + (i / data.length) * 0.7,
          }}
        />
      ))}
    </div>
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
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      gsap.fromTo(
        ref.current.children,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: "power2.out" }
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
      color: "text-info",
      bg: "bg-info-muted",
      rawColor: "#3b82f6",
      chartType: "bars" as const,
      chartData: [82, 95, 74, 110, 88, 102, 97, 85, 92],
      expandedDetails: {
        subtitle: "Payment volume over last 7 days",
        bars: [82, 95, 74, 110, 88, 102, 97],
        barLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        stats: [
          { label: "Completed", value: `${Math.round(payments * 0.74)}` },
          { label: "Pending", value: `${Math.round(payments * 0.18)}` },
          { label: "Failed", value: `${Math.round(payments * 0.08)}` },
        ],
      },
    },
    {
      label: "Conversion",
      value: `${conversionRate}%`,
      change: null,
      icon: Percent,
      color: "text-success",
      bg: "bg-success-muted",
      rawColor: "#22c55e",
      chartType: "donut" as const,
      chartData: [conversionRate],
      expandedDetails: {
        subtitle: "Checkout to payment success rate",
        bars: [68, 72, 71, 74, 70, 76, 74],
        barLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        stats: [
          { label: "Visits", value: "1,683" },
          { label: "Checkouts", value: "1,247" },
          { label: "Paid", value: "924" },
        ],
      },
    },
    {
      label: "Avg. Payment",
      value: `$${avgPayment}`,
      change: avgChange,
      icon: DollarSign,
      color: "text-primary",
      bg: "bg-primary-muted",
      rawColor: "#ff6600",
      chartType: "gauge" as const,
      chartData: [avgPayment],
      expandedDetails: {
        subtitle: "Average transaction value trend",
        bars: [380, 410, 395, 450, 420, 460, 435],
        barLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        stats: [
          { label: "Highest", value: "$2,100" },
          { label: "Lowest", value: "$12.50" },
          { label: "Median", value: "$285" },
        ],
      },
    },
    {
      label: "Active Links",
      value: activeLinks.toString(),
      change: null,
      icon: LinkIcon,
      color: "text-warning",
      bg: "bg-warning-muted",
      rawColor: "#eab308",
      chartType: "candlestick" as const,
      chartData: [5, 8, 12, 15, 18, 14, 20, 23, 19],
      expandedDetails: {
        subtitle: "Payment links usage",
        bars: [5, 8, 12, 15, 18, 20, 23],
        barLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        stats: [
          { label: "Created", value: "38" },
          { label: "Active", value: `${activeLinks}` },
          { label: "Expired", value: "15" },
        ],
      },
    },
  ];

  function toggleExpand(index: number) {
    setExpandedIndex(expandedIndex === index ? null : index);
  }

  function renderMiniChart(item: typeof items[number]) {
    switch (item.chartType) {
      case "bars":
        return <MiniBarChartInline data={item.chartData} color={item.rawColor} />;
      case "donut":
        return <MiniDonutChart value={item.chartData[0]} max={100} color={item.rawColor} />;
      case "gauge":
        return <MiniGaugeChart value={Math.min((item.chartData[0] / 500) * 100, 100)} color={item.rawColor} />;
      case "candlestick":
        return <MiniCandlestickChart data={item.chartData} color={item.rawColor} />;
    }
  }

  return (
    <div ref={ref} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item, index) => {
        const isExpanded = expandedIndex === index;

        return (
          <div
            key={item.label}
            className={cn(
              "group relative overflow-hidden rounded-xl border border-border bg-background transition-all duration-300 cursor-pointer hover:border-border-hover hover:shadow-lg",
              isExpanded && "border-border-hover shadow-lg"
            )}
            onClick={() => toggleExpand(index)}
          >
            {/* Subtle glow on hover */}
            <div
              className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: `radial-gradient(circle, ${item.rawColor}15 0%, transparent 70%)` }}
            />

            {/* Main content */}
            <div className="relative flex items-center gap-3.5 px-4 py-4">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", item.bg)}>
                <item.icon className={cn("h-[18px] w-[18px]", item.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted">{item.label}</p>
                <div className="flex items-center gap-2">
                  <p className="font-heading text-lg font-bold tabular-nums text-foreground">{item.value}</p>
                  {item.change !== null && (
                    <span className={cn(
                      "flex items-center gap-0.5 text-[10px] font-semibold",
                      item.change > 0 ? "text-success" : item.change < 0 ? "text-error" : "text-muted"
                    )}>
                      {item.change > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      {item.change > 0 ? "+" : ""}{item.change}%
                    </span>
                  )}
                </div>
              </div>

              {/* Mini chart */}
              <div className="shrink-0 mr-1">
                {renderMiniChart(item)}
              </div>

              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted transition-transform duration-300",
                  isExpanded && "rotate-180"
                )}
              />
            </div>

            {/* Expanded details */}
            <div
              className={cn(
                "grid transition-all duration-300 ease-in-out",
                isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div className="border-t border-border/50 px-4 pb-4 pt-3">
                  <p className="mb-3 text-[10px] uppercase tracking-wider text-muted">
                    {item.expandedDetails.subtitle}
                  </p>

                  {/* Mini bar chart */}
                  <MiniBarChart data={item.expandedDetails.bars} color={item.rawColor} />

                  {/* Bar labels */}
                  <div className="mt-1 flex gap-[3px]">
                    {item.expandedDetails.barLabels.map((label) => (
                      <span key={label} className="flex-1 text-center text-[8px] text-muted/60">
                        {label}
                      </span>
                    ))}
                  </div>

                  {/* Stats row */}
                  <div className="mt-3 flex items-center gap-2">
                    {item.expandedDetails.stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="flex-1 rounded-lg px-2 py-1.5"
                        style={{ background: `${item.rawColor}08` }}
                      >
                        <p className="text-[8px] uppercase tracking-wider text-muted">{stat.label}</p>
                        <p className="text-[11px] font-semibold tabular-nums text-foreground">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
