import { Card, CardContent, CardHeader } from "@/components/ui/card";

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? "h-4 w-full"}`} />;
}

function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="border-b border-border/50">
        <SkeletonLine className="h-4 w-36" />
        <SkeletonLine className="h-3 w-48" />
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonLine className="h-3.5 w-full" />
            <SkeletonLine className="h-3 w-2/3" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 lg:px-8">
      <div className="space-y-2">
        <SkeletonLine className="h-8 w-40" />
        <SkeletonLine className="h-4 w-72" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
