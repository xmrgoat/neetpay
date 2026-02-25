"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  total: number;
  page: number;
  limit: number;
}

export function Pagination({ total, page, limit }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.ceil(total / limit);

  const goToPage = useCallback(
    (p: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (p <= 1) {
        params.delete("page");
      } else {
        params.set("page", p.toString());
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // Don't render if everything fits on one page
  if (total <= limit) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted">
        Showing {start}-{end} of {total}
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => goToPage(page - 1)}
          disabled={isFirst}
          className="inline-flex items-center gap-1 h-8 px-3 text-xs border border-border rounded-lg hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} />
          Previous
        </button>

        <span className="text-xs text-muted tabular-nums">
          Page {page} of {totalPages}
        </span>

        <button
          onClick={() => goToPage(page + 1)}
          disabled={isLast}
          className="inline-flex items-center gap-1 h-8 px-3 text-xs border border-border rounded-lg hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
