export default function ActionItemRunLoading() {
  return (
    <div className="px-4 pb-32 pt-6 lg:px-10">
      <div className="mb-6 space-y-2">
        <div className="h-6 w-64 animate-pulse rounded bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
