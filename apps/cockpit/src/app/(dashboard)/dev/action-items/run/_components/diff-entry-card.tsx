import type { RunActionItemAgentResult } from "@/actions/dev-action-item-runner";

export function DiffEntryCard({
  entry,
}: {
  entry: RunActionItemAgentResult["comparison"]["diff"][number];
}) {
  const colorClass =
    entry.status === "match"
      ? "border-emerald-200 bg-emerald-50"
      : entry.status === "extra"
        ? "border-amber-200 bg-amber-50"
        : "border-rose-200 bg-rose-50";

  const iconChar = entry.status === "match" ? "✓" : entry.status === "extra" ? "+" : "−";

  const iconColor =
    entry.status === "match"
      ? "text-emerald-700"
      : entry.status === "extra"
        ? "text-amber-700"
        : "text-rose-700";

  return (
    <li className={`rounded-md border p-3 ${colorClass}`}>
      <div className="flex items-start gap-2">
        <span className={`font-mono text-base font-bold ${iconColor}`}>{iconChar}</span>
        <div className="flex-1 space-y-2">
          {entry.status === "match" && entry.extracted && entry.golden && (
            <>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Agent · sim {((entry.similarity ?? 0) * 100).toFixed(0)}%
                  {entry.type_werk_matches !== undefined &&
                    ` · type_werk ${entry.type_werk_matches ? "✓" : "✗"}`}
                </span>
                <p className="text-[12.5px] font-medium">{entry.extracted.content}</p>
                <p className="text-[11px] text-muted-foreground">
                  contact: {entry.extracted.follow_up_contact}
                  {entry.extracted.type_werk && ` · type ${entry.extracted.type_werk}`}
                  {entry.extracted.deadline && ` · deadline ${entry.extracted.deadline}`}
                  {entry.extracted.follow_up_date && ` · opvolg ${entry.extracted.follow_up_date}`}
                </p>
                {entry.extracted.reasoning && (
                  <p className="mt-1 text-[11px] italic text-muted-foreground">
                    <span className="font-semibold not-italic">reasoning:</span>{" "}
                    {entry.extracted.reasoning}
                  </p>
                )}
              </div>
              <div className="border-t border-border/40 pt-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Golden
                </span>
                <p className="text-[12.5px]">{entry.golden.content}</p>
                <p className="text-[11px] text-muted-foreground">
                  contact: {entry.golden.follow_up_contact}
                  {entry.golden.type_werk && ` · type ${entry.golden.type_werk}`}
                  {entry.golden.deadline && ` · deadline ${entry.golden.deadline}`}
                </p>
              </div>
            </>
          )}
          {entry.status === "extra" && entry.extracted && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                False positive (niet in golden)
              </span>
              <p className="text-[12.5px] font-medium">{entry.extracted.content}</p>
              <p className="text-[11px] text-muted-foreground">
                contact: {entry.extracted.follow_up_contact}
                {entry.extracted.type_werk && ` · type ${entry.extracted.type_werk}`}
                {entry.extracted.deadline && ` · deadline ${entry.extracted.deadline}`}
                {entry.extracted.follow_up_date && ` · opvolg ${entry.extracted.follow_up_date}`}
              </p>
              {entry.extracted.source_quote && (
                <blockquote className="mt-1 border-l-2 border-amber-300 pl-2 text-[11px] italic text-muted-foreground">
                  &ldquo;{entry.extracted.source_quote}&rdquo;
                </blockquote>
              )}
              {entry.extracted.reasoning && (
                <p className="mt-1 text-[11px] italic text-amber-900/80">
                  <span className="font-semibold not-italic">reasoning:</span>{" "}
                  {entry.extracted.reasoning}
                </p>
              )}
            </div>
          )}
          {entry.status === "missed" && entry.golden && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-800">
                False negative (gemist)
              </span>
              <p className="text-[12.5px] font-medium">{entry.golden.content}</p>
              <p className="text-[11px] text-muted-foreground">
                contact: {entry.golden.follow_up_contact}
                {entry.golden.type_werk && ` · type ${entry.golden.type_werk}`}
              </p>
              {entry.golden.source_quote && (
                <blockquote className="mt-1 border-l-2 border-rose-300 pl-2 text-[11px] italic text-muted-foreground">
                  &ldquo;{entry.golden.source_quote}&rdquo;
                </blockquote>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
