import { auth } from "@/lib/auth";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { TransactionTable } from "@/components/dashboard/transaction-table";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Overview
        </h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}.
        </p>
      </div>

      <OverviewCards />

      <div>
        <h2 className="text-sm font-medium uppercase tracking-widest text-foreground-secondary mb-4">
          Recent Transactions
        </h2>
        <TransactionTable transactions={[]} />
      </div>
    </div>
  );
}
