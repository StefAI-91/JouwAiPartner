import type { InboxItem } from "@repo/database/queries/inbox";
import { InboxRow } from "./inbox-row";

/**
 * Time-grouped lijst-render. Buckets: Vandaag, Eerder deze week, Eerder.
 * Sticky-headers met backdrop-blur — zelfde look als design-referentie
 * `/inbox-preview`.
 *
 * Server-component: client-row's worden aangeroepen met de gepre-renderde
 * fixture. Filter-werk gebeurt op de page, niet hier.
 */
export function InboxList({ items }: { items: InboxItem[] }) {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // zondag-start

  const buckets: { label: string; items: InboxItem[] }[] = [
    { label: "Vandaag", items: [] },
    { label: "Eerder deze week", items: [] },
    { label: "Eerder", items: [] },
  ];

  for (const item of items) {
    const t = new Date(item.activityAt).getTime();
    if (t >= todayStart.getTime()) buckets[0].items.push(item);
    else if (t >= weekStart.getTime()) buckets[1].items.push(item);
    else buckets[2].items.push(item);
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {buckets.map((b) =>
        b.items.length === 0 ? null : (
          <section key={b.label}>
            <div className="sticky top-0 z-10 flex items-baseline gap-3 border-b border-border/30 bg-background/95 px-6 py-2 backdrop-blur-sm">
              <span className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/80 uppercase">
                {b.label}
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground/50">
                {b.items.length}
              </span>
            </div>
            <ul>
              {b.items.map((item) => (
                <InboxRow key={`${item.kind}:${item.id}`} item={item} currentTime={now} />
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}
