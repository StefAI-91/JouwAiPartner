export default function ClientsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
        <div className="mt-2 h-4 w-40 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[2rem] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="h-6 w-44 animate-pulse rounded bg-muted" />
              <div className="flex gap-1.5">
                <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
              </div>
            </div>
            <div className="mt-3 flex gap-4">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
