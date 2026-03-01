"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  useContainerWidth,
  ResponsiveGridLayout,
  verticalCompactor,
  type Layout,
} from "react-grid-layout";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  GripVertical,
  X,
  Plus,
  RotateCcw,
  Lock,
  Unlock,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWidgetLayout } from "@/hooks/use-widget-layout";
import { useWidgetContext } from "@/hooks/use-widget-context";
import {
  WIDGET_REGISTRY,
  getWidgetById,
  type WidgetLayoutItem,
} from "@/lib/dashboard/widget-registry";
import {
  WIDGET_RENDERERS,
  type AnalyticsWidgetData,
} from "@/components/dashboard/analytics-widgets";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WidgetGridProps {
  data: AnalyticsWidgetData;
}

// ---------------------------------------------------------------------------
// Add Widget Dialog
// ---------------------------------------------------------------------------

function AddWidgetDialog({
  open,
  onClose,
  visibleWidgets,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  visibleWidgets: string[];
  onAdd: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "kpi" | "chart" | "deep">("all");
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!open || !ref.current) return;
    gsap.fromTo(ref.current,
      { opacity: 0, scale: 0.96, y: 8 },
      { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: "power3.out" }
    );
  }, { dependencies: [open] });

  if (!open) return null;

  const filtered = WIDGET_REGISTRY.filter((w) => {
    if (activeCategory !== "all" && w.category !== activeCategory) return false;
    if (search && !w.label.toLowerCase().includes(search.toLowerCase()) && !w.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const categories = [
    { id: "all" as const, label: "All" },
    { id: "kpi" as const, label: "KPIs" },
    { id: "chart" as const, label: "Charts" },
    { id: "deep" as const, label: "Deep Analytics" },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div ref={ref} className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-lg rounded-xl border border-border bg-elevated shadow-2xl sm:inset-x-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Add Widget</h2>
            <p className="text-[11px] text-muted mt-0.5">Choose a widget to add to your dashboard</p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              placeholder="Search widgets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-1.5 px-4 pt-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
                activeCategory === cat.id
                  ? "bg-primary text-white"
                  : "bg-surface text-muted hover:text-foreground"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Widget list */}
        <div className="max-h-[50vh] overflow-y-auto p-3 no-scrollbar">
          <div className="space-y-1">
            {filtered.map((w) => {
              const isActive = visibleWidgets.includes(w.id);
              const Icon = w.icon;
              return (
                <button
                  key={w.id}
                  onClick={() => {
                    if (!isActive) onAdd(w.id);
                  }}
                  disabled={isActive}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
                    isActive
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-surface/80 active:scale-[0.99]"
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface border border-border">
                    <Icon className="h-4 w-4 text-foreground-secondary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-foreground">{w.label}</p>
                    <p className="text-[10px] text-muted truncate">{w.description}</p>
                  </div>
                  {isActive ? (
                    <span className="shrink-0 rounded-md bg-success/10 px-2 py-0.5 text-[9px] font-semibold text-success">
                      Active
                    </span>
                  ) : (
                    <Plus className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-xs text-muted">No widgets match your search</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Widget Grid
// ---------------------------------------------------------------------------

export function WidgetGrid({ data }: WidgetGridProps) {
  const {
    layout,
    visibleWidgets,
    isEditing,
    hydrated,
    setIsEditing,
    updateLayout,
    addWidget,
    removeWidget,
    resetLayout,
  } = useWidgetLayout();

  const {
    registerWidgetPage,
    unregisterWidgetPage,
  } = useWidgetContext();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Register as the widget page
  useEffect(() => {
    registerWidgetPage();
    return () => unregisterWidgetPage();
  }, [registerWidgetPage, unregisterWidgetPage]);

  // Listen for "open-add-widget" custom event from the header button
  useEffect(() => {
    function handleOpenAddWidget() {
      setAddDialogOpen(true);
    }
    window.addEventListener("neetpay:open-add-widget", handleOpenAddWidget);
    return () => window.removeEventListener("neetpay:open-add-widget", handleOpenAddWidget);
  }, []);

  // GSAP entrance animation
  useGSAP(() => {
    if (!containerRef.current || !hydrated) return;
    const items = containerRef.current.querySelectorAll("[data-widget]");
    if (!items.length) return;
    gsap.fromTo(items,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.04, ease: "power3.out" }
    );
  }, { scope: containerRef, dependencies: [hydrated] });

  // Container width measurement
  const { containerRef: widthRef, width: containerWidth } = useContainerWidth({ measureBeforeMount: false });

  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      const mapped: WidgetLayoutItem[] = newLayout.map((l) => ({
        i: l.i,
        x: l.x,
        y: l.y,
        w: l.w,
        h: l.h,
        minW: l.minW,
        minH: l.minH,
      }));
      updateLayout(mapped);
    },
    [updateLayout]
  );

  // Build responsive layouts
  const breakpointLayouts = useMemo(() => {
    const md = layout.map((l) => ({
      ...l,
      w: Math.min(l.w, 6),
      x: l.x >= 6 ? 0 : Math.min(l.x, 5),
    }));
    const sm = layout.map((l) => ({
      ...l,
      x: 0,
      w: 1,
    }));
    return { lg: layout, md, sm };
  }, [layout]);

  if (!hydrated) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-background" />
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-medium transition-all duration-200 active:scale-[0.98]",
            isEditing
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-surface/60 text-muted hover:bg-surface hover:text-foreground hover:border-border-hover"
          )}
        >
          {isEditing ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
          <span className="hidden sm:inline">{isEditing ? "Editing" : "Edit Layout"}</span>
        </button>

        <button
          onClick={() => setAddDialogOpen(true)}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[11px] font-semibold text-white transition-all duration-200 hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.98]"
          style={{ boxShadow: "0 2px 12px rgba(255,102,0,0.25)" }}
        >
          <Plus className="h-3 w-3" />
          <span className="hidden sm:inline">Add Widget</span>
        </button>

        {isEditing && (
          <button
            onClick={resetLayout}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-3 text-[11px] font-medium text-muted transition-all duration-200 hover:bg-surface hover:text-foreground hover:border-border-hover active:scale-[0.98]"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}

        <span className="ml-auto text-[10px] text-muted">
          {visibleWidgets.length} widget{visibleWidgets.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid */}
      <div ref={widthRef}>
        <ResponsiveGridLayout
          className="widget-grid-layout"
          layouts={breakpointLayouts}
          breakpoints={{ lg: 1024, md: 768, sm: 0 }}
          cols={{ lg: 12, md: 6, sm: 1 }}
          rowHeight={40}
          width={containerWidth || 1200}
          dragConfig={{ enabled: isEditing, handle: ".widget-drag-handle" }}
          resizeConfig={{ enabled: isEditing }}
          compactor={verticalCompactor}
          margin={[16, 16] as const}
          containerPadding={[0, 0] as const}
          onLayoutChange={(currentLayout) => {
            handleLayoutChange(currentLayout);
          }}
        >
          {layout.map((item) => {
            const def = getWidgetById(item.i);
            const Renderer = WIDGET_RENDERERS[item.i];
            if (!def || !Renderer) return null;

            return (
              <div
                key={item.i}
                data-widget
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-background transition-shadow",
                  isEditing
                    ? "border-border-hover shadow-md cursor-grab active:cursor-grabbing"
                    : "border-border"
                )}
              >
                {/* Drag handle (only visible in edit mode) */}
                {isEditing && (
                  <div className="widget-drag-handle absolute inset-x-0 top-0 z-10 flex h-6 items-center justify-center bg-gradient-to-b from-surface/80 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                    <GripVertical className="h-3.5 w-3.5 text-muted" />
                  </div>
                )}

                {/* Remove button (only visible in edit mode) */}
                {isEditing && (
                  <button
                    onClick={() => removeWidget(item.i)}
                    className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-md bg-error/10 text-error opacity-0 transition-opacity hover:bg-error/20 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}

                {/* Widget content */}
                <Renderer d={data} />
              </div>
            );
          })}
        </ResponsiveGridLayout>
      </div>

      {/* Add Widget Dialog — portal to body so it escapes any overflow clipping */}
      {typeof document !== "undefined" &&
        createPortal(
          <AddWidgetDialog
            open={addDialogOpen}
            onClose={() => setAddDialogOpen(false)}
            visibleWidgets={visibleWidgets}
            onAdd={(id) => {
              addWidget(id);
              setAddDialogOpen(false);
            }}
          />,
          document.body
        )}
    </div>
  );
}
