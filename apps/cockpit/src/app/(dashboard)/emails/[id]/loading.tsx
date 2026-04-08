export default function EmailDetailLoading() {
  return (
    <div className="space-y-6 px-4 py-8 lg:px-10">
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="space-y-3">
        <div className="h-6 w-3/4 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
