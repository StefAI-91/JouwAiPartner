export default function ClientDetailLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <div>
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-8 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="mt-2 flex gap-2">
          <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
