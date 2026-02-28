import { Card } from "@/components/ui/card";

export function SkeletonCard() {
  return (
    <Card className="p-3 animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
        <div className="space-y-1 text-right">
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="h-4 w-12 rounded bg-muted" />
        </div>
      </div>
    </Card>
  );
}

export function SkeletonStatCard() {
  return (
    <Card className="animate-pulse">
      <div className="pt-4 px-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-muted h-9 w-9" />
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-6 w-24 rounded bg-muted" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export function SkeletonSmallStat() {
  return (
    <Card className="animate-pulse">
      <div className="pt-4 px-4 pb-4 text-center space-y-2">
        <div className="h-3 w-16 mx-auto rounded bg-muted" />
        <div className="h-5 w-8 mx-auto rounded bg-muted" />
        <div className="h-3 w-12 mx-auto rounded bg-muted" />
      </div>
    </Card>
  );
}
