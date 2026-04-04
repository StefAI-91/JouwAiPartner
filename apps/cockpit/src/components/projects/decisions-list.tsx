interface Decision {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  meeting: { id: string; title: string | null } | null;
}

interface DecisionsListProps {
  items: Decision[];
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

export function DecisionsList({ items }: DecisionsListProps) {
  if (items.length === 0) {
    return (
      <section className="mb-6 rounded-lg border border-border/30 px-5 py-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
          Besluiten
        </h3>
        <p className="mt-3 text-sm text-muted-foreground/60">Geen besluiten gevonden</p>
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-lg border border-border/30 px-5 py-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B3F]/70">
          Besluiten
        </h3>
        <span className="text-xs text-muted-foreground/55 tabular-nums">{items.length}</span>
      </div>

      <div className="space-y-2">
        {items.map((decision) => {
          const context = decision.metadata.context ? String(decision.metadata.context) : null;
          const madeBy = decision.metadata.made_by ? String(decision.metadata.made_by) : null;
          const date = decision.metadata.date ? String(decision.metadata.date) : null;
          const source = decision.meeting?.title ?? null;

          return (
            <div
              key={decision.id}
              className="rounded-md bg-muted/30 px-3 py-3 border-l-2 border-[#006B3F]/20"
            >
              <p className="text-sm font-semibold">{decision.content}</p>
              {context && (
                <p className="mt-1 text-[13px] text-muted-foreground/65">{context}</p>
              )}
              <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground/55">
                {date && <span className="tabular-nums">{formatDateShort(date)}</span>}
                {date && madeBy && <span>&middot;</span>}
                {madeBy && <span>{madeBy}</span>}
                {source && (
                  <>
                    <span>&middot;</span>
                    <span>{source}</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
