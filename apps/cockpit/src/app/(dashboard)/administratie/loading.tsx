export default function AdministratieLoading() {
  return (
    <div className="space-y-6 px-4 py-8 lg:px-10">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-44 animate-pulse rounded-lg bg-muted" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="h-10 w-48 animate-pulse rounded-full bg-muted" />
      </div>

      <div className="flex gap-2">
        <div className="h-10 w-28 animate-pulse rounded-lg bg-muted" />
        <div className="h-10 w-24 animate-pulse rounded-lg bg-muted" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white px-5 py-4 shadow-sm">
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="mt-3 flex gap-2">
              <div className="h-4 w-16 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="mt-3 h-3 w-28 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
