import { SkeletonStatCard, SkeletonSmallStat } from "@/components/skeleton-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="h-8 w-32 rounded bg-muted animate-pulse" />
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-6 space-y-6 lg:space-y-0">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SkeletonSmallStat />
            <SkeletonSmallStat />
            <SkeletonSmallStat />
            <SkeletonSmallStat />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 h-9 rounded bg-muted animate-pulse" />
            ))}
          </div>
        </div>
        <Card className="h-fit">
          <CardHeader>
            <div className="h-5 w-28 rounded bg-muted animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between animate-pulse">
                <div className="space-y-1">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
                <div className="h-4 w-16 rounded bg-muted" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
