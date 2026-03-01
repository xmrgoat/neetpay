"use client";

import { useState, useCallback, useEffect } from "react";
import {
  DEFAULT_LAYOUT,
  DEFAULT_VISIBLE_WIDGETS,
  WIDGET_REGISTRY,
  type WidgetLayoutItem,
} from "@/lib/dashboard/widget-registry";

const STORAGE_KEY_LAYOUT = "neetpay-widget-layout";
const STORAGE_KEY_VISIBLE = "neetpay-widget-visible";

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded or private mode — ignore */
  }
}

export function useWidgetLayout() {
  const [layout, setLayoutState] = useState<WidgetLayoutItem[]>(DEFAULT_LAYOUT);
  const [visibleWidgets, setVisibleState] = useState<string[]>(DEFAULT_VISIBLE_WIDGETS);
  const [isEditing, setIsEditing] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount
  useEffect(() => {
    const storedLayout = loadFromStorage<WidgetLayoutItem[]>(STORAGE_KEY_LAYOUT, DEFAULT_LAYOUT);
    const storedVisible = loadFromStorage<string[]>(STORAGE_KEY_VISIBLE, DEFAULT_VISIBLE_WIDGETS);
    setLayoutState(storedLayout);
    setVisibleState(storedVisible);
    setHydrated(true);
  }, []);

  // Persist on change (skip initial hydration)
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(STORAGE_KEY_LAYOUT, layout);
  }, [layout, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(STORAGE_KEY_VISIBLE, visibleWidgets);
  }, [visibleWidgets, hydrated]);

  // Update layout when react-grid-layout fires onLayoutChange
  const updateLayout = useCallback((newLayout: WidgetLayoutItem[]) => {
    setLayoutState(newLayout);
  }, []);

  // Toggle a widget on/off
  const toggleWidget = useCallback((widgetId: string) => {
    setVisibleState((prev) => {
      if (prev.includes(widgetId)) {
        return prev.filter((id) => id !== widgetId);
      }
      return [...prev, widgetId];
    });
  }, []);

  // Add a widget that's not currently visible
  const addWidget = useCallback((widgetId: string) => {
    const def = WIDGET_REGISTRY.find((w) => w.id === widgetId);
    if (!def) return;

    setVisibleState((prev) => {
      if (prev.includes(widgetId)) return prev;
      return [...prev, widgetId];
    });

    setLayoutState((prev) => {
      // If already in layout, keep it
      if (prev.find((l) => l.i === widgetId)) return prev;
      // Find the bottom of the current layout
      const maxY = prev.reduce((max, item) => Math.max(max, item.y + item.h), 0);
      return [
        ...prev,
        {
          i: widgetId,
          x: 0,
          y: maxY,
          w: def.defaultW,
          h: def.defaultH,
          minW: def.minW,
          minH: def.minH,
        },
      ];
    });
  }, []);

  // Remove a widget
  const removeWidget = useCallback((widgetId: string) => {
    setVisibleState((prev) => prev.filter((id) => id !== widgetId));
  }, []);

  // Reset to default
  const resetLayout = useCallback(() => {
    setLayoutState(DEFAULT_LAYOUT);
    setVisibleState(DEFAULT_VISIBLE_WIDGETS);
    saveToStorage(STORAGE_KEY_LAYOUT, DEFAULT_LAYOUT);
    saveToStorage(STORAGE_KEY_VISIBLE, DEFAULT_VISIBLE_WIDGETS);
  }, []);

  // Only return layout items for currently visible widgets
  const activeLayout = layout.filter((l) => visibleWidgets.includes(l.i));

  return {
    layout: activeLayout,
    visibleWidgets,
    isEditing,
    hydrated,
    setIsEditing,
    updateLayout,
    toggleWidget,
    addWidget,
    removeWidget,
    resetLayout,
  };
}
