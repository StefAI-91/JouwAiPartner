interface Need {
  id: string;
  content: string;
  meeting: { id: string; title: string | null } | null;
}

interface NeedsListProps {
  items: Need[];
}

export function NeedsList({ items }: NeedsListProps) {
  if (items.length === 0) return null;

  return (
    <section className="mb-6 rounded-lg border border-border/30 px-5 py-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
          Open behoeften
        </h3>
        <span className="text-xs text-muted-foreground/55 tabular-nums">
          {items.length} open
        </span>
      </div>

      <div className="space-y-2">
        {items.map((need) => (
          <div key={need.id} className="rounded-md bg-muted/30 px-3 py-3">
            <p className="text-sm">{need.content}</p>
            {need.meeting?.title && (
              <p className="mt-1 text-xs text-muted-foreground/55">{need.meeting.title}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
