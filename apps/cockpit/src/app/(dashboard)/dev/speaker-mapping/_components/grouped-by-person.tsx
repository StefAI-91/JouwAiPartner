interface MappingItem {
  speaker_id: string;
  person_name: string;
  confidence: number;
  reasoning: string;
}

export function GroupedByPerson({ mappings }: { mappings: MappingItem[] }) {
  // Bucket per person_name; lege person_name komt onder "(onzeker)".
  const buckets = new Map<string, MappingItem[]>();
  for (const m of mappings) {
    const key = m.person_name || "__unmapped__";
    const list = buckets.get(key) ?? [];
    list.push(m);
    buckets.set(key, list);
  }

  // Sorteer: gemapte personen eerst (op aantal labels aflopend), unmapped onderaan.
  const entries = Array.from(buckets.entries()).sort((a, b) => {
    if (a[0] === "__unmapped__") return 1;
    if (b[0] === "__unmapped__") return -1;
    return b[1].length - a[1].length;
  });

  return (
    <ul className="mt-3 space-y-2 text-[12.5px]">
      {entries.map(([key, items]) => {
        const isUnmapped = key === "__unmapped__";
        const avgConfidence = items.reduce((s, i) => s + i.confidence, 0) / items.length;
        return (
          <li
            key={key}
            className={`rounded-md border p-3 ${
              isUnmapped
                ? "border-rose-200 bg-rose-50"
                : avgConfidence >= 0.85
                  ? "border-emerald-200 bg-emerald-50"
                  : avgConfidence >= 0.6
                    ? "border-amber-200 bg-amber-50"
                    : "border-orange-200 bg-orange-50"
            }`}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-semibold">
                {isUnmapped ? <span className="italic">(onzeker / niet gemapt)</span> : key}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {items.length} label{items.length === 1 ? "" : "s"}
              </span>
              {!isUnmapped && (
                <span className="ml-auto text-[11px] text-muted-foreground">
                  ⌀ conf {avgConfidence.toFixed(2)}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {items
                .sort((a, b) => b.confidence - a.confidence)
                .map((it) => (
                  <span
                    key={it.speaker_id}
                    className="inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-0.5 font-mono text-[11px]"
                    title={it.reasoning}
                  >
                    {it.speaker_id}
                    <span className="text-muted-foreground">{it.confidence.toFixed(2)}</span>
                  </span>
                ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
