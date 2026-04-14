export default function AdministratieDetailLoading() {
  return (
    <div className="space-y-8 px-4 py-8 lg:px-10">
      <div>
        <div className="h-4 w-36 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-8 w-72 animate-pulse rounded-lg bg-muted" />
        <div className="mt-3 flex gap-2">
          <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="mt-4 h-4 w-80 animate-pulse rounded bg-muted" />
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 w-full animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
