"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentFiltersProps {
  statusCounts: Record<string, number>;
}

const STATUSES = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "pending", label: "Pending" },
  { key: "confirming", label: "Confirming" },
  { key: "expired", label: "Expired" },
  { key: "failed", label: "Failed" },
] as const;

export function PaymentFilters({ statusCounts }: PaymentFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeStatus = searchParams.get("status") || "all";
  const searchParam = searchParams.get("search") || "";

  const [searchValue, setSearchValue] = useState(searchParam);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Sync local state when URL param changes externally
  useEffect(() => {
    setSearchValue(searchParam);
  }, [searchParam]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  function handleStatusClick(key: string) {
    updateParams({
      status: key === "all" ? null : key,
      page: null,
    });
  }

  function handleSearchChange(value: string) {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({
        search: value || null,
        page: null,
      });
    }, 300);
  }

  function clearSearch() {
    setSearchValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    updateParams({ search: null, page: null });
  }

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {/* Status tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {STATUSES.map(({ key, label }) => {
          const isActive = activeStatus === key;
          const count = key === "all" ? total : (statusCounts[key] ?? 0);

          return (
            <button
              key={key}
              onClick={() => handleStatusClick(key)}
              className={cn(
                "inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap",
                isActive
                  ? "bg-primary-muted text-primary"
                  : "text-muted hover:text-foreground hover:bg-surface",
              )}
            >
              {label}
              {count > 0 && (
                <span
                  className={cn(
                    "text-xs rounded-full px-1.5 ml-1 tabular-nums",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "bg-surface text-muted",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search input */}
      <div className="relative w-full sm:w-64">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
        />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by track ID or hash..."
          className="h-8 w-full rounded-lg border border-border bg-surface pl-8 pr-8 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary/50 transition-colors"
        />
        {searchValue && (
          <button
            onClick={clearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
