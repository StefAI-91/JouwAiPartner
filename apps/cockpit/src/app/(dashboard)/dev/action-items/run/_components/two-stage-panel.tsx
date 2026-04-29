import type { RunActionItemAgentResult } from "@/actions/dev-action-item-runner";
import { Stat } from "./stat";

export function TwoStagePanel({
  debug,
}: {
  debug: NonNullable<RunActionItemAgentResult["twoStage"]>;
}) {
  return (
    <section className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4">
      <h2 className="text-sm font-semibold">Two-stage debug</h2>
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] md:grid-cols-4">
        <Stat label="Spotter latency" value={`${debug.spotter_metrics.latency_ms} ms`} />
        <Stat
          label="Spotter tokens"
          value={`${debug.spotter_metrics.input_tokens ?? 0}/${debug.spotter_metrics.output_tokens ?? 0}`}
          hint="in/out"
        />
        <Stat label="Candidates" value={debug.spotter_metrics.candidate_count} />
        <Stat
          label="Accept/Reject"
          value={`${debug.judge_metrics.accept_count}/${debug.judge_metrics.reject_count}`}
        />
        <Stat label="Judge latency" value={`${debug.judge_metrics.latency_ms} ms`} />
        <Stat
          label="Judge tokens"
          value={`${debug.judge_metrics.input_tokens ?? 0}/${debug.judge_metrics.output_tokens ?? 0}`}
          hint="in/out"
        />
        <Stat label="Judge reasoning" value={debug.judge_metrics.reasoning_tokens ?? "—"} />
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-[12px] font-semibold hover:underline">
          Candidates ({debug.candidates.length})
        </summary>
        <ul className="mt-2 space-y-1 text-[11.5px]">
          {debug.candidates.map((c, i) => {
            const judgement = debug.judgements.find((j) => j.candidate_index === i + 1);
            const status = judgement?.decision ?? "—";
            const statusClass =
              status === "accept"
                ? "text-emerald-700"
                : status === "reject"
                  ? "text-rose-700"
                  : "text-muted-foreground";
            return (
              <li key={i} className="rounded-md border border-border/40 bg-background/50 p-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">[{i + 1}]</span>
                  <span className="rounded-sm bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-indigo-800">
                    {c.pattern_type}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{c.speaker}</span>
                  <span className={`ml-auto text-[10px] font-semibold uppercase ${statusClass}`}>
                    {status}
                  </span>
                </div>
                <p className="mt-1 italic">&ldquo;{c.quote}&rdquo;</p>
                {judgement?.decision === "reject" && judgement.rejection_reason && (
                  <p
                    className={`mt-1 text-[10.5px] ${
                      judgement.rejection_reason.startsWith("validator-override:")
                        ? "text-purple-800"
                        : judgement.rejection_reason.startsWith("auto-gate:")
                          ? "text-amber-800"
                          : "text-rose-700"
                    }`}
                  >
                    <span className="font-semibold">
                      {judgement.rejection_reason.startsWith("validator-override:")
                        ? "validator:"
                        : judgement.rejection_reason.startsWith("auto-gate:")
                          ? "auto-gate:"
                          : "reject:"}
                    </span>{" "}
                    {judgement.rejection_reason
                      .replace(/^validator-override:\s*/, "")
                      .replace(/^auto-gate:\s*/, "")}
                  </p>
                )}
                {judgement?.decision === "accept" && judgement.accepted && (
                  <p className="mt-1 text-[10.5px] text-emerald-700">
                    <span className="font-semibold">accept:</span> {judgement.accepted.content}{" "}
                    <span className="text-muted-foreground">
                      (type {judgement.accepted.type_werk}, conf{" "}
                      {judgement.accepted.confidence.toFixed(2)}
                      {judgement.accepted.deadline && `, deadline ${judgement.accepted.deadline}`}
                      {judgement.accepted.follow_up_date &&
                        `, opvolg ${judgement.accepted.follow_up_date}`}
                      )
                    </span>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </details>

      <details className="mt-3">
        <summary className="cursor-pointer text-[12px] font-semibold hover:underline">
          Spotter prompt ({debug.candidate_spotter_prompt.length.toLocaleString("nl-NL")} chars)
        </summary>
        <pre className="mt-2 max-h-[400px] overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-[11px] leading-relaxed">
          {debug.candidate_spotter_prompt}
        </pre>
      </details>

      {debug.judge_prompt && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[12px] font-semibold hover:underline">
            Judge prompt ({debug.judge_prompt.length.toLocaleString("nl-NL")} chars)
          </summary>
          <pre className="mt-2 max-h-[400px] overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-[11px] leading-relaxed">
            {debug.judge_prompt}
          </pre>
        </details>
      )}
    </section>
  );
}
