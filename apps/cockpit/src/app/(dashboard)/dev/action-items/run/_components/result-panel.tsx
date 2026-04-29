import type { RunActionItemAgentResult } from "@/actions/dev-action-item-runner";
import { DiffEntryCard } from "./diff-entry-card";
import { GatedPanel } from "./gated-panel";
import { Stat } from "./stat";
import { TwoStagePanel } from "./two-stage-panel";

export function ResultPanel({ result }: { result: RunActionItemAgentResult }) {
  const { meetingContext, agent, golden, comparison } = result;
  const fmt = (n: number) => `${(n * 100).toFixed(0)}%`;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="text-sm font-semibold">Metrics</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] md:grid-cols-4">
          <Stat
            label="Precision"
            value={fmt(comparison.precision)}
            hint={`${comparison.matched} matched / ${comparison.matched + comparison.extra} extracted`}
          />
          <Stat
            label="Recall"
            value={fmt(comparison.recall)}
            hint={`${comparison.matched} matched / ${comparison.matched + comparison.missed} golden`}
          />
          <Stat label="F1" value={fmt(comparison.f1)} hint="harmonic mean" />
          <Stat
            label="Type_werk acc."
            value={
              comparison.type_werk_accuracy === null ? "—" : fmt(comparison.type_werk_accuracy)
            }
            hint="op gematchte items"
          />
          <Stat label="Matched" value={comparison.matched} variant="ok" />
          <Stat label="Extra (FP)" value={comparison.extra} variant="warn" />
          <Stat label="Missed (FN)" value={comparison.missed} variant="warn" />
          <Stat label="Golden items" value={golden.item_count} />
        </dl>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="text-sm font-semibold">Agent run</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] md:grid-cols-4">
          <Stat label="Mode" value={agent.mode} />
          <Stat label="Model" value={agent.model} />
          <Stat label="Prompt v" value={agent.promptVersion} />
          <Stat label="Latency" value={`${agent.metrics.latency_ms} ms`} />
          <Stat label="Input tokens" value={agent.metrics.input_tokens ?? "—"} />
          <Stat label="Output tokens" value={agent.metrics.output_tokens ?? "—"} />
          <Stat label="Reasoning tokens" value={agent.metrics.reasoning_tokens ?? "—"} />
          <Stat
            label="Transcript chars"
            value={meetingContext.transcript_length.toLocaleString("nl-NL")}
          />
          <Stat label="Transcript bron" value={meetingContext.transcript_source ?? "—"} />
          <Stat label="Items extracted" value={agent.items.length} />
        </dl>
      </section>

      {agent.gated && agent.gated.length > 0 && <GatedPanel gated={agent.gated} />}

      {result.twoStage && <TwoStagePanel debug={result.twoStage} />}

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="text-sm font-semibold">Diff per item ({comparison.diff.length})</h2>
        <ul className="mt-3 space-y-2 text-[12.5px]">
          {comparison.diff.map(
            (d: RunActionItemAgentResult["comparison"]["diff"][number], i: number) => (
              <DiffEntryCard key={i} entry={d} />
            ),
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <details>
          <summary className="cursor-pointer text-sm font-semibold hover:underline">
            System prompt ({result.systemPrompt.length.toLocaleString("nl-NL")} chars)
          </summary>
          <pre className="mt-3 max-h-[600px] overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-[11px] leading-relaxed">
            {result.systemPrompt}
          </pre>
        </details>
      </section>
    </div>
  );
}
