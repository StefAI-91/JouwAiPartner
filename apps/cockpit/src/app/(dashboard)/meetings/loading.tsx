export default function MeetingsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-4 w-4 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
