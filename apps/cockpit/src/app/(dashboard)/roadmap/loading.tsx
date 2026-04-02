import { Card, CardContent, CardHeader } from "@/components/ui/card";

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? "h-4 w-full"}`} />;
}

function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="border-b border-border/50">
        <SkeletonLine className="h-4 w-48" />
        <SkeletonLine className="h-3 w-64" />
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <SkeletonLine className="h-4 w-4 rounded-full" />
            <SkeletonLine className="h-3.5 w-3/4" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function RoadmapLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8">
      <div className="space-y-2">
        <SkeletonLine className="h-8 w-32" />
        <SkeletonLine className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} size="sm">
            <CardContent className="pt-1 text-center">
              <SkeletonLine className="mx-auto h-7 w-10" />
              <SkeletonLine className="mx-auto mt-1 h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
