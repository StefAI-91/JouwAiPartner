export default function MeetingDetailLoading() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem-7rem)] flex-col lg:flex-row">
      {/* Left panel skeleton */}
      <div className="flex-1 border-r border-border/50 p-6 lg:w-[55%] lg:flex-none">
        <div className="mb-6">
          <div className="flex gap-2">
            <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="mt-3 h-8 w-72 animate-pulse rounded-lg bg-muted" />
          <div className="mt-2 h-4 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-6 w-56 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="mb-6 flex gap-2">
          <div className="h-7 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-7 w-24 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-muted" style={{ width: `${70 + Math.random() * 30}%` }} />
          ))}
        </div>
      </div>

      {/* Right panel skeleton */}
      <div className="flex-1 p-6 lg:w-[45%] lg:flex-none">
        <div className="h-7 w-32 animate-pulse rounded-lg bg-muted" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-1 w-full animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
