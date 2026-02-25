import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";

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
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm lg:px-8">
          <div>
            <p className="text-sm font-medium text-foreground">
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
        </header>

        {/* Page content */}
        <div className="mx-auto max-w-[1400px] px-6 py-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
