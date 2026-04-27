export default function GoldenCoderLoading() {
  return (
    <div className="px-4 pb-32 pt-6 lg:px-10">
      <div className="mb-6 space-y-2">
        <div className="h-6 w-72 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-[500px] animate-pulse rounded-xl bg-muted" />
        <div className="h-[500px] animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
