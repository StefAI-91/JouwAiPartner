export default function GoldenPickerLoading() {
  return (
    <div className="px-4 pb-32 pt-6 lg:px-10">
      <div className="mb-8 space-y-2">
        <div className="h-6 w-56 animate-pulse rounded bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
