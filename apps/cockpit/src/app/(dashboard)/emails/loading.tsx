export default function EmailsLoading() {
  return (
    <div className="space-y-6 px-4 py-8 lg:px-10">
      <div>
        <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-16 animate-pulse rounded-xl bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg p-2.5">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
