/**
 * Loading-skeleton voor `ThemePillsStrip`. Reserveert hoogte zodat er geen
 * layout-shift is zodra de echte pills binnenkomen.
 */
export function ThemePillsSkeleton() {
  const widths = [120, 160, 140, 100, 180, 130, 150, 110];
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-3 w-48 animate-pulse rounded bg-muted" />
        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex flex-wrap gap-2">
        {widths.map((w, i) => (
          <div
            key={i}
            className="h-8 animate-pulse rounded-full border border-border/70 bg-card"
            style={{ width: `${w}px` }}
          />
        ))}
      </div>
    </div>
  );
}
