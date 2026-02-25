import { TransactionTable } from "@/components/dashboard/transaction-table";

export default function PaymentsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Payments
        </h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          View and manage all your payment transactions.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        {["All", "Paid", "Waiting", "Expired"].map((filter) => (
          <button
            key={filter}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:text-foreground transition-colors first:bg-elevated first:text-foreground"
          >
            {filter}
          </button>
        ))}
      </div>

      <TransactionTable transactions={[]} />
    </div>
  );
}
