// import { redirect } from "next/navigation";
// import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: re-enable auth check
  // const session = await auth();
  // if (!session?.user) {
  //   redirect("/login");
  // }

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar />
      <main className="ml-16 min-h-dvh">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
