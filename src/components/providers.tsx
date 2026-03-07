"use client";

import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="light"
      themes={["dark", "light", "midnight", "ember", "ocean", "emerald", "rose"]}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
