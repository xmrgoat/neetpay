import { Badge } from "@/components/ui/badge";
import type { PaymentStatus } from "@/lib/constants";

interface Transaction {
  id: string;
  trackId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-12 text-center">
        <p className="text-sm text-foreground-secondary">
          No transactions yet. Create your first payment to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-widest text-foreground-secondary">
              Track ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-widest text-foreground-secondary">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-widest text-foreground-secondary">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-widest text-foreground-secondary">
              Date
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr
              key={tx.id}
              className="border-b border-border last:border-b-0 hover:bg-elevated transition-colors"
            >
              <td className="px-6 py-4">
                <span className="font-mono text-xs text-foreground-secondary">
                  {tx.trackId}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="font-mono text-sm">
                  ${tx.amount.toFixed(2)}
                </span>
                <span className="ml-1.5 text-xs text-foreground-secondary uppercase">
                  {tx.currency}
                </span>
              </td>
              <td className="px-6 py-4">
                <Badge status={tx.status} />
              </td>
              <td className="px-6 py-4 text-sm text-foreground-secondary">
                {new Date(tx.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
