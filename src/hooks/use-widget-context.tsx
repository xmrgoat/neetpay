"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Context — lets the header know when the analytics widget page is mounted
// ---------------------------------------------------------------------------

interface WidgetContextValue {
  /** Whether the analytics widget grid is currently mounted */
  isWidgetPage: boolean;
  /** Called by WidgetGrid on mount */
  registerWidgetPage: () => void;
  /** Called by WidgetGrid on unmount */
  unregisterWidgetPage: () => void;
}

const WidgetContext = createContext<WidgetContextValue>({
  isWidgetPage: false,
  registerWidgetPage: () => {},
  unregisterWidgetPage: () => {},
});

export function WidgetProvider({ children }: { children: ReactNode }) {
  const [isWidgetPage, setIsWidgetPage] = useState(false);

  const registerWidgetPage = useCallback(() => setIsWidgetPage(true), []);
  const unregisterWidgetPage = useCallback(() => setIsWidgetPage(false), []);

  return (
    <WidgetContext.Provider
      value={{ isWidgetPage, registerWidgetPage, unregisterWidgetPage }}
    >
      {children}
    </WidgetContext.Provider>
  );
}

export function useWidgetContext() {
  return useContext(WidgetContext);
}
