import type { RunActionItemAgentResult } from "@/actions/dev-action-item-runner";

export function GatedPanel({
  gated,
}: {
  gated: NonNullable<RunActionItemAgentResult["agent"]["gated"]>;
}) {
  const classify = (reason: string): "validator" | "auto-gate" => {
    if (reason.startsWith("validator-override:")) return "validator";
    return "auto-gate";
  };

  const validatorCount = gated.filter((g) => classify(g.reason) === "validator").length;
  const autoGateCount = gated.length - validatorCount;

  return (
    <section className="rounded-xl border border-border/60 bg-card p-4">
      <h2 className="text-sm font-semibold">Gefilterd door gate of validator ({gated.length})</h2>
      <p className="mt-1 text-[11.5px] text-muted-foreground">
        Items die het model wilde extraheren maar door een nageschakelde check zijn afgewezen.
        <span className="ml-2 inline-flex items-center gap-1 rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-800">
          auto-gate {autoGateCount}
        </span>
        <span className="ml-1 inline-flex items-center gap-1 rounded-sm bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-purple-800">
          validator {validatorCount}
        </span>
      </p>
      <ul className="mt-3 space-y-2 text-[12px]">
        {gated.map((g, i) => {
          const kind = classify(g.reason);
          const colorClass =
            kind === "validator"
              ? "border-purple-200 bg-purple-50"
              : "border-amber-200 bg-amber-50";
          const tagClass =
            kind === "validator" ? "bg-purple-200 text-purple-900" : "bg-amber-200 text-amber-900";
          return (
            <li key={i} className={`rounded-md border ${colorClass} p-3`}>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${tagClass}`}
                >
                  {kind === "validator" ? "validator-override" : "auto-gate"}
                </span>
                <span className="rounded-sm bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-800">
                  type {g.item.type_werk}
                </span>
                <span className="text-[10.5px] text-muted-foreground">
                  conf {g.item.confidence.toFixed(2)}
                </span>
                {g.item.follow_up_contact && (
                  <span className="ml-auto text-[10.5px] text-muted-foreground">
                    contact: {g.item.follow_up_contact}
                  </span>
                )}
              </div>
              <p className="mt-1 font-medium">{g.item.content}</p>
              {g.item.source_quote && (
                <p className="mt-1 italic text-muted-foreground">
                  &ldquo;{g.item.source_quote}&rdquo;
                </p>
              )}
              {g.item.jaip_followup_quote && (
                <p className="mt-1 text-[11.5px]">
                  <span className="font-semibold">JAIP-vervolgstap:</span>{" "}
                  <span className="italic">&ldquo;{g.item.jaip_followup_quote}&rdquo;</span>
                </p>
              )}
              <p className="mt-1 text-[11.5px]">
                <span className="font-semibold">Action-classificatie:</span>{" "}
                {g.item.jaip_followup_action} · <span className="font-semibold">recipient:</span>{" "}
                {g.item.recipient_per_quote}
              </p>
              {(g.item.deadline || g.item.follow_up_date) && (
                <p className="mt-1 text-[11.5px]">
                  {g.item.deadline && (
                    <>
                      <span className="font-semibold">Deadline:</span> {g.item.deadline}
                    </>
                  )}
                  {g.item.deadline && g.item.follow_up_date && " · "}
                  {g.item.follow_up_date && (
                    <>
                      <span className="font-semibold">Opvolgdatum:</span> {g.item.follow_up_date}
                    </>
                  )}
                </p>
              )}
              <p className="mt-2 rounded-sm bg-white/60 p-2 text-[11px]">
                <span className="font-semibold">Reden filter:</span> {g.reason}
              </p>
              {g.validator && (
                <p className="mt-1 text-[11px] text-purple-900">
                  <span className="font-semibold">Validator zei:</span> {g.validator.verdict} —{" "}
                  {g.validator.reason}
                </p>
              )}
              {g.item.reasoning && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  <span className="font-semibold">Model reasoning:</span> {g.item.reasoning}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
