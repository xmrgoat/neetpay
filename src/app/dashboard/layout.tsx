"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { WidgetProvider } from "@/hooks/use-widget-context";
import { isAuthenticated, getMerchant, getToken } from "@/hooks/useAuth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [merchantEmail, setMerchantEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    getMerchant()
      .then((m) => {
        if (m) {
          setMerchantEmail(m.email);
        } else {
          // Backend unreachable — fall back to JWT claims
          try {
            const token = getToken();
            if (token) {
              const payload = JSON.parse(atob(token.split(".")[1]));
              setMerchantEmail(payload.email || null);
            }
          } catch { /* ignore */ }
        }
        setReady(true);
      })
      .catch(() => {
        // Network error — still allow access with valid JWT
        try {
          const token = getToken();
          if (token) {
            const payload = JSON.parse(atob(token.split(".")[1]));
            setMerchantEmail(payload.email || null);
          }
        } catch { /* ignore */ }
        setReady(true);
      });
  }, [router]);

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <WidgetProvider>
      <div className="flex h-dvh bg-surface">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header className="z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 pl-14 pr-4 backdrop-blur-sm lg:pl-6 lg:pr-6">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                Welcome back{merchantEmail ? `, ${merchantEmail}` : ""}
              </p>
              <p className="text-xs text-muted">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <DashboardHeader />
          </header>

          {/* Page content — fills remaining height, children handle their own scroll */}
          <div className="min-h-0 flex-1 overflow-hidden px-4 py-5 lg:px-6">
            {children}
          </div>
        </main>
      </div>
    </WidgetProvider>
  );
}
