import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getPayments, getStatusCounts } from "@/lib/dashboard/queries";
import { TransactionTable } from "@/components/dashboard/transaction-table";
import { PaymentFilters } from "@/components/dashboard/payment-filters";
import { Pagination } from "@/components/dashboard/pagination";
import type { Payment } from "@/types";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function PaymentsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const status = params.status || "all";
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);
  const limit = 20;

  const [paymentsData, statusCounts] = await Promise.all([
    getPayments(session.user.id, {
      status: status === "all" ? undefined : status,
      search: search || undefined,
      page,
      limit,
    }),
    getStatusCounts(session.user.id),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-lg font-semibold text-foreground">
          Payments
        </h1>
        <p className="text-xs text-muted mt-0.5">
          Track and manage all your transactions
        </p>
      </div>

      <div className="rounded-xl border border-border bg-background">
        <div className="border-b border-border px-5 py-4">
          <Suspense>
            <PaymentFilters statusCounts={statusCounts} />
          </Suspense>
        </div>

        <TransactionTable payments={paymentsData.payments as Payment[]} />

        <div className="border-t border-border px-5 py-3">
          <Suspense>
            <Pagination
              page={paymentsData.page}
              total={paymentsData.total}
              limit={paymentsData.limit}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
