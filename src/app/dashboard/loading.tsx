export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-1.5">
        <div className="h-6 w-36 rounded-md bg-surface animate-pulse-subtle" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-4 rounded-xl border border-border bg-background p-5 animate-pulse-subtle"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="h-10 w-10 shrink-0 rounded-lg bg-surface" />
            <div className="flex-1 space-y-2 pt-0.5">
              <div className="h-3 w-20 rounded bg-surface" />
              <div className="h-5 w-28 rounded bg-surface" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Transactions grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div
          className="xl:col-span-3 h-80 rounded-xl border border-border bg-background animate-pulse-subtle"
          style={{ animationDelay: "320ms" }}
        />
        <div
          className="xl:col-span-2 h-80 rounded-xl border border-border bg-background animate-pulse-subtle"
          style={{ animationDelay: "400ms" }}
        />
      </div>
    </div>
  );
}
