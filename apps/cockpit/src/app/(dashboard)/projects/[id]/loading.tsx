export default function ProjectDetailLoading() {
  return (
    <div className="px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-8 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="mt-3 flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-4 border-b border-border/50 pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-5 w-24 animate-pulse rounded bg-muted" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="space-y-3 pt-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="h-4 w-56 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-36 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
