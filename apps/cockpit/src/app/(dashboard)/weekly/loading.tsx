function SkeletonLine({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? "h-4 w-full"}`} />;
}

export default function WeeklyLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <SkeletonLine className="h-8 w-56" />
        <SkeletonLine className="h-4 w-80" />
      </div>
      <div className="rounded-xl bg-white p-6 shadow-sm space-y-3">
        <SkeletonLine className="h-5 w-40" />
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-3/4" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white p-5 shadow-sm space-y-3">
            <SkeletonLine className="h-4 w-32" />
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
