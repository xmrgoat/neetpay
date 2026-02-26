import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SecurityContent } from "@/components/dashboard/security/security-content";

export default async function SecurityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="h-full overflow-y-auto no-scrollbar space-y-6 pb-4">
      <div>
        <h1 className="font-heading text-lg font-semibold text-foreground">
          Profile & Security
        </h1>
        <p className="text-xs text-muted mt-0.5">
          Manage your login security, 2FA, and monitor account activity
        </p>
      </div>

      <SecurityContent
        userName={session.user.name ?? "User"}
        userEmail={session.user.email ?? ""}
      />
    </div>
  );
}
