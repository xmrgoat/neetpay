"use client";

import { TransactionTable } from "@/components/dashboard/transaction-table";
import type { Payment } from "@/types";

export default function PaymentsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-lg font-semibold text-foreground">
          Invoices
        </h1>
        <p className="text-xs text-muted mt-0.5">
          Track and manage all your invoices
        </p>
      </div>

      <div className="rounded-xl border border-border bg-background">
        <TransactionTable payments={[] as Payment[]} />
      </div>
    </div>
  );
}
