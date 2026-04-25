"use client";

import { useState, useTransition } from "react";
import { formatDate } from "@repo/ui/format";
import {
  runActionItemAgentAction,
  type RunActionItemAgentResult,
} from "@/actions/dev-action-item-runner";

interface MeetingOption {
  id: string;
  title: string;
  date: string | null;
  meeting_type: string | null;
  golden_item_count: number;
}

interface Props {
  meetings: MeetingOption[];
}

export function RunActionItemHarnessClient({ meetings }: Props) {
  const [selectedId, setSelectedId] = useState<string>(meetings[0]?.id ?? "");
  const [confidenceThreshold, setConfidenceThreshold] = useState(0);
  const [contentThreshold, setContentThreshold] = useState(0.4);
  const [result, setResult] = useState<RunActionItemAgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const runAgent = () => {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      const res = await runActionItemAgentAction({
        meetingId: selectedId,
        confidenceThreshold,
        contentThreshold,
      });
      if ("error" in res) {
        setError(res.error);
        setResult(null);
      } else {
        setResult(res);
      }
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border/60 bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
            Meeting (alleen gecodeerde)
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={isPending}
              className="rounded-md border border-border/60 bg-background px-3 py-2 text-[13px]"
            >
              {meetings.map((m) => (
                <option key={m.id} value={m.id}>
                  {formatDate(m.date)} — {m.title} ({m.golden_item_count} items)
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
            Confidence ≥
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              className="w-20 rounded-md border border-border/60 bg-background px-2 py-2 text-[13px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
            Match-similarity ≥
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={contentThreshold}
              onChange={(e) => setContentThreshold(parseFloat(e.target.value))}
              className="w-20 rounded-md border border-border/60 bg-background px-2 py-2 text-[13px]"
            />
          </label>
          <button
            type="button"
            onClick={runAgent}
            disabled={isPending || !selectedId}
            className="self-end rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground disabled:opacity-50"
          >
            {isPending ? "Running…" : "Run agent"}
          </button>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Token-cost is reëel. Sonnet 4.6 high-effort op een uur transcript ≈ €0,10–0,25 per run.
        </p>
      </section>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && <ResultPanel result={result} />}
    </div>
  );
}

function ResultPanel({ result }: { result: RunActionItemAgentResult }) {
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
          <Stat label="Items extracted" value={agent.items.length} />
        </dl>
      </section>

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

function DiffEntryCard({
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
                  {entry.extracted.deadline && ` · ${entry.extracted.deadline}`}
                </p>
              </div>
              <div className="border-t border-border/40 pt-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Golden
                </span>
                <p className="text-[12.5px]">{entry.golden.content}</p>
                <p className="text-[11px] text-muted-foreground">
                  contact: {entry.golden.follow_up_contact}
                  {entry.golden.type_werk && ` · type ${entry.golden.type_werk}`}
                  {entry.golden.deadline && ` · ${entry.golden.deadline}`}
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
              </p>
              {entry.extracted.source_quote && (
                <blockquote className="mt-1 border-l-2 border-amber-300 pl-2 text-[11px] italic text-muted-foreground">
                  &ldquo;{entry.extracted.source_quote}&rdquo;
                </blockquote>
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

function Stat({
  label,
  value,
  hint,
  variant = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  variant?: "default" | "ok" | "warn";
}) {
  const valueClass =
    variant === "ok"
      ? "text-emerald-700"
      : variant === "warn"
        ? "text-amber-700"
        : "text-foreground";
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`font-mono text-sm ${valueClass}`}>{value}</dd>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
