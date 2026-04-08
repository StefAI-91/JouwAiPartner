function SkeletonLine({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? "h-4 w-full"}`} />;
}

export default function IntelligenceLoading() {
  return (
    <div className="space-y-6 px-4 py-8 lg:px-10">
      <div className="space-y-2">
        <SkeletonLine className="h-7 w-40" />
        <SkeletonLine className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-white p-8 space-y-4">
            <SkeletonLine className="mx-auto h-14 w-14 rounded-xl" />
            <SkeletonLine className="mx-auto h-5 w-24" />
            <SkeletonLine className="mx-auto h-3 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
