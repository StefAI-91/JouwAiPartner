export default function ReviewLoading() {
  return (
    <div className="space-y-6 px-4 py-8">
      <div>
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[2rem] bg-white p-6 shadow-sm">
            <div className="h-3 w-40 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-6 w-64 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-48 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-3 w-56 animate-pulse rounded bg-muted" />
            <div className="mt-5 flex justify-end gap-2">
              <div className="h-9 w-20 animate-pulse rounded-full bg-muted" />
              <div className="h-9 w-24 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
