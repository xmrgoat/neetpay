import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-dvh bg-surface">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm lg:px-6">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              Welcome back{session.user.name ? `, ${session.user.name}` : ""}
            </p>
            <p className="text-xs text-muted">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <DashboardHeader userName={session.user.name} />
        </header>

        {/* Page content — fills remaining height, children handle their own scroll */}
        <div className="min-h-0 flex-1 overflow-hidden px-4 py-5 lg:px-6">
          {children}
        </div>
      </main>
    </div>
  );
}
