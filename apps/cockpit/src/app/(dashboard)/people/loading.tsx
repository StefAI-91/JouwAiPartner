export default function PeopleLoading() {
  return (
    <div className="space-y-6 px-4 py-8">
      <div>
        <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
        <div className="mt-2 h-4 w-44 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-[2rem] bg-white p-5 shadow-sm">
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
            <div className="mt-2 flex gap-3">
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
