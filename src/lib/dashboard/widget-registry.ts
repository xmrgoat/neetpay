// ---------------------------------------------------------------------------
// Widget Registry — defines all available analytics widgets
// ---------------------------------------------------------------------------

import type { LucideIcon } from "lucide-react";
import {
  DollarSign,
  Hash,
  TrendingUp,
  TrendingDown,
  Timer,
  CheckCircle2,
  XCircle,
  Activity,
  BarChart3,
  Trophy,
  MousePointerClick,
  LayoutGrid,
  Clock,
  PieChart,
  GitBranch,
  Map,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WidgetSize = "sm" | "md" | "lg" | "xl";

export interface WidgetDefinition {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Minimum columns the widget should occupy (out of 12) */
  minW: number;
  /** Minimum rows */
  minH: number;
  /** Default columns */
  defaultW: number;
  /** Default rows */
  defaultH: number;
  /** Category for grouping in the add-widget dialog */
  category: "kpi" | "chart" | "deep";
  /** Which data keys this widget needs from the server data */
  dataKeys: string[];
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  // ── KPI Widgets ──
  {
    id: "kpi-volume",
    label: "Total Volume",
    description: "Total payment volume with period comparison",
    icon: DollarSign,
    minW: 3, minH: 2, defaultW: 3, defaultH: 2,
    category: "kpi",
    dataKeys: ["totalVolume", "periodComparison"],
  },
  {
    id: "kpi-transactions",
    label: "Transactions",
    description: "Total transaction count with trend",
    icon: Hash,
    minW: 3, minH: 2, defaultW: 3, defaultH: 2,
    category: "kpi",
    dataKeys: ["totalTransactions", "periodComparison"],
  },
  {
    id: "kpi-avg-value",
    label: "Avg Value",
    description: "Average payment value",
    icon: TrendingUp,
    minW: 3, minH: 2, defaultW: 3, defaultH: 2,
    category: "kpi",
    dataKeys: ["avgValue"],
  },
  {
    id: "kpi-avg-time",
    label: "Avg Confirm Time",
    description: "Average confirmation time",
    icon: Timer,
    minW: 3, minH: 2, defaultW: 3, defaultH: 2,
    category: "kpi",
    dataKeys: ["avgPaymentTime"],
  },
  {
    id: "kpi-success-rate",
    label: "Success Rate",
    description: "Payment success percentage",
    icon: CheckCircle2,
    minW: 2, minH: 2, defaultW: 2, defaultH: 2,
    category: "kpi",
    dataKeys: ["successMetrics"],
  },
  {
    id: "kpi-failure-rate",
    label: "Failure Rate",
    description: "Payment failure percentage",
    icon: XCircle,
    minW: 2, minH: 2, defaultW: 2, defaultH: 2,
    category: "kpi",
    dataKeys: ["successMetrics"],
  },
  {
    id: "kpi-expired",
    label: "Expired",
    description: "Expired payment percentage",
    icon: Timer,
    minW: 2, minH: 2, defaultW: 2, defaultH: 2,
    category: "kpi",
    dataKeys: ["successMetrics"],
  },
  {
    id: "kpi-refund-rate",
    label: "Refund Rate",
    description: "Payment refund percentage",
    icon: TrendingDown,
    minW: 2, minH: 2, defaultW: 2, defaultH: 2,
    category: "kpi",
    dataKeys: ["successMetrics"],
  },
  {
    id: "kpi-underpaid",
    label: "Underpaid",
    description: "Underpaid payment percentage",
    icon: Activity,
    minW: 2, minH: 2, defaultW: 2, defaultH: 2,
    category: "kpi",
    dataKeys: ["successMetrics"],
  },

  // ── Chart Widgets ──
  {
    id: "chart-volume",
    label: "Payment Volume",
    description: "Daily transaction volume over time",
    icon: BarChart3,
    minW: 4, minH: 4, defaultW: 6, defaultH: 5,
    category: "chart",
    dataKeys: ["data"],
  },
  {
    id: "chart-crypto",
    label: "By Cryptocurrency",
    description: "Revenue breakdown by cryptocurrency",
    icon: PieChart,
    minW: 4, minH: 4, defaultW: 6, defaultH: 5,
    category: "chart",
    dataKeys: ["data"],
  },
  {
    id: "chart-status",
    label: "Status Distribution",
    description: "Payment outcomes overview (donut chart)",
    icon: PieChart,
    minW: 6, minH: 5, defaultW: 12, defaultH: 5,
    category: "chart",
    dataKeys: ["data"],
  },

  // ── Deep Analytics Widgets ──
  {
    id: "deep-funnel",
    label: "Conversion Funnel",
    description: "Payment flow from created to paid",
    icon: GitBranch,
    minW: 4, minH: 4, defaultW: 6, defaultH: 5,
    category: "deep",
    dataKeys: ["funnel"],
  },
  {
    id: "deep-chains",
    label: "Chain Distribution",
    description: "Payment volume by blockchain",
    icon: Map,
    minW: 4, minH: 4, defaultW: 6, defaultH: 5,
    category: "deep",
    dataKeys: ["chainDistribution"],
  },
  {
    id: "deep-weekday",
    label: "Revenue by Weekday",
    description: "Which days generate the most revenue",
    icon: BarChart3,
    minW: 4, minH: 4, defaultW: 6, defaultH: 5,
    category: "deep",
    dataKeys: ["weekdayRevenue"],
  },
  {
    id: "deep-avg-time",
    label: "Average Payment Time",
    description: "From creation to completion",
    icon: Clock,
    minW: 4, minH: 4, defaultW: 6, defaultH: 5,
    category: "deep",
    dataKeys: ["avgPaymentTime"],
  },
  {
    id: "deep-sizes",
    label: "Payment Sizes",
    description: "Distribution of payment amounts",
    icon: BarChart3,
    minW: 4, minH: 4, defaultW: 6, defaultH: 5,
    category: "deep",
    dataKeys: ["amountDistribution"],
  },
  {
    id: "deep-currencies",
    label: "Top Currencies",
    description: "Currencies ranked by volume",
    icon: Trophy,
    minW: 4, minH: 4, defaultW: 6, defaultH: 5,
    category: "deep",
    dataKeys: ["topCurrencies"],
  },
  {
    id: "deep-daily",
    label: "Daily Activity",
    description: "Payments created vs completed over time",
    icon: MousePointerClick,
    minW: 6, minH: 5, defaultW: 12, defaultH: 5,
    category: "deep",
    dataKeys: ["dailyCounts"],
  },
  {
    id: "deep-heatmap",
    label: "Activity Heatmap",
    description: "Payment frequency by hour and day",
    icon: LayoutGrid,
    minW: 6, minH: 5, defaultW: 12, defaultH: 5,
    category: "deep",
    dataKeys: ["hourlyHeatmap"],
  },
];

export function getWidgetById(id: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY.find((w) => w.id === id);
}

// ---------------------------------------------------------------------------
// Default layout — what the user sees on first visit
// ---------------------------------------------------------------------------

export interface WidgetLayoutItem {
  i: string;   // widget id
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export const DEFAULT_LAYOUT: WidgetLayoutItem[] = [
  // Row 0-1: KPI cards
  { i: "kpi-volume",       x: 0,  y: 0, w: 3, h: 2, minW: 3, minH: 2 },
  { i: "kpi-transactions", x: 3,  y: 0, w: 3, h: 2, minW: 3, minH: 2 },
  { i: "kpi-avg-value",    x: 6,  y: 0, w: 3, h: 2, minW: 3, minH: 2 },
  { i: "kpi-avg-time",     x: 9,  y: 0, w: 3, h: 2, minW: 3, minH: 2 },
  // Row 2-3: Rate KPIs (5 across)
  { i: "kpi-success-rate", x: 0,  y: 2, w: 2, h: 2, minW: 2, minH: 2 },
  { i: "kpi-failure-rate", x: 2,  y: 2, w: 2, h: 2, minW: 2, minH: 2 },
  { i: "kpi-expired",      x: 4,  y: 2, w: 3, h: 2, minW: 2, minH: 2 },
  { i: "kpi-refund-rate",  x: 7,  y: 2, w: 2, h: 2, minW: 2, minH: 2 },
  { i: "kpi-underpaid",    x: 9,  y: 2, w: 3, h: 2, minW: 2, minH: 2 },
  // Row 4-8: Charts
  { i: "chart-volume",     x: 0,  y: 4, w: 6, h: 5, minW: 4, minH: 4 },
  { i: "chart-crypto",     x: 6,  y: 4, w: 6, h: 5, minW: 4, minH: 4 },
  { i: "chart-status",     x: 0,  y: 9, w: 12,h: 5, minW: 6, minH: 5 },
  // Row 14+: Deep analytics
  { i: "deep-funnel",      x: 0,  y: 14, w: 6, h: 5, minW: 4, minH: 4 },
  { i: "deep-chains",      x: 6,  y: 14, w: 6, h: 5, minW: 4, minH: 4 },
  { i: "deep-weekday",     x: 0,  y: 19, w: 6, h: 5, minW: 4, minH: 4 },
  { i: "deep-avg-time",    x: 6,  y: 19, w: 6, h: 5, minW: 4, minH: 4 },
  { i: "deep-sizes",       x: 0,  y: 24, w: 6, h: 5, minW: 4, minH: 4 },
  { i: "deep-currencies",  x: 6,  y: 24, w: 6, h: 5, minW: 4, minH: 4 },
  { i: "deep-daily",       x: 0,  y: 29, w: 12,h: 5, minW: 6, minH: 5 },
  { i: "deep-heatmap",     x: 0,  y: 34, w: 12,h: 5, minW: 6, minH: 5 },
];

export const DEFAULT_VISIBLE_WIDGETS = DEFAULT_LAYOUT.map((l) => l.i);
