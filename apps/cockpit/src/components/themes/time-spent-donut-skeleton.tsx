/**
 * Loading-skeleton voor `TimeSpentDonut`. Cirkel + legend-regels gematcht
 * qua footprint zodat er geen layout-shift is bij data-binnenkomst.
 */
export function TimeSpentDonutSkeleton() {
  return (
    <div className="flex items-center gap-6 rounded-xl border border-border/60 bg-muted/20 p-5">
      <div className="h-[140px] w-[140px] shrink-0 animate-pulse rounded-full bg-muted/60" />
      <div className="flex-1 space-y-2">
        {[130, 110, 150, 100, 140, 120].map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-sm bg-muted/80" />
            <div className="h-3 animate-pulse rounded bg-muted" style={{ width: `${w}px` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
