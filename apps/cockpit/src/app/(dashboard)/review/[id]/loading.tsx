import { Card, CardContent, CardHeader } from "@repo/ui/card";

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? "h-4 w-full"}`} />;
}

export default function ReviewDetailLoading() {
  return (
    <div className="space-y-6 px-4 py-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <SkeletonLine className="h-4 w-20" />
        <SkeletonLine className="h-8 w-64" />
        <SkeletonLine className="h-4 w-48" />
      </div>

      {/* Transcript skeleton */}
      <Card>
        <CardHeader className="border-b border-border/50">
          <SkeletonLine className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonLine key={i} className={`h-3.5 ${i % 3 === 0 ? "w-2/3" : "w-full"}`} />
          ))}
        </CardContent>
      </Card>

      {/* Extractions skeleton */}
      <Card>
        <CardHeader className="border-b border-border/50">
          <SkeletonLine className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <SkeletonLine className="h-3 w-24" />
              <SkeletonLine className="h-4 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
