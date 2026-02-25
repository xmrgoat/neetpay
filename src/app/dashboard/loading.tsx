export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="h-8 w-48 rounded-lg bg-elevated animate-pulse" />
        <div className="mt-2 h-4 w-72 rounded-lg bg-elevated animate-pulse" />
      </div>

      {/* Cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-xl border border-border bg-surface animate-pulse"
          />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="h-64 rounded-xl border border-border bg-surface animate-pulse" />
    </div>
  );
}
