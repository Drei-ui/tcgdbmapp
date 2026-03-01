export default function ReportsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4 animate-pulse">
      {/* Title */}
      <div className="h-8 w-32 bg-muted rounded" />

      {/* Date range badges */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-6 w-16 bg-muted rounded-full" />
        ))}
      </div>

      {/* Filter badges */}
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-6 w-14 bg-muted rounded-full" />
        ))}
      </div>

      {/* Tabs */}
      <div className="h-9 bg-muted rounded-lg" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-xl" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="space-y-2">
        <div className="h-10 bg-muted rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted/60 rounded" />
        ))}
      </div>
    </div>
  );
}
