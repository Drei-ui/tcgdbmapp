export default function CashLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-8 w-32 rounded bg-muted animate-pulse" />
          <div className="h-4 w-40 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="rounded-lg bg-muted/50 p-4 text-center animate-pulse">
        <div className="h-4 w-24 mx-auto rounded bg-muted mb-2" />
        <div className="h-8 w-32 mx-auto rounded bg-muted" />
      </div>
      <div className="flex gap-2">
        <div className="flex-1 h-9 rounded bg-muted animate-pulse" />
        <div className="flex-1 h-9 rounded bg-muted animate-pulse" />
      </div>
      <div className="space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex justify-between p-2 animate-pulse">
            <div className="space-y-1">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
