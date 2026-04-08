function SkeletonLine({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? "h-4 w-full"}`} />;
}

export default function TeamNeedsLoading() {
  return (
    <div className="space-y-6 px-4 py-8 lg:px-10">
      <div className="space-y-2">
        <SkeletonLine className="h-7 w-48" />
        <SkeletonLine className="h-4 w-64" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <SkeletonLine className="h-5 w-40" />
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="rounded-xl bg-white p-4 shadow-sm space-y-2">
                <SkeletonLine className="h-4 w-full" />
                <SkeletonLine className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
