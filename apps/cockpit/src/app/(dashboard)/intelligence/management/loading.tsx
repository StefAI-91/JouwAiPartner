function SkeletonLine({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? "h-4 w-full"}`} />;
}

export default function ManagementLoading() {
  return (
    <div className="space-y-6 px-4 py-8 lg:px-10">
      <div className="space-y-2">
        <SkeletonLine className="h-7 w-48" />
        <SkeletonLine className="h-4 w-64" />
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-2xl bg-white p-5 shadow-sm">
            <SkeletonLine className="h-4 w-1/3" />
            <SkeletonLine className="h-5 w-2/3" />
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-3 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
