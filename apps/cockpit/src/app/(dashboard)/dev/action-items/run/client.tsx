"use client";

import { useState, useTransition } from "react";
import { formatDate } from "@repo/ui/format";
import {
  runActionItemAgentAction,
  type RunActionItemAgentResult,
} from "@/actions/dev-action-item-runner";
import { ResultPanel } from "./_components/result-panel";

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
  const [promptVersion, setPromptVersion] = useState<"v2" | "v3" | "v4" | "v5">("v2");
  const [mode, setMode] = useState<"single" | "two-stage" | "spotter-only">("single");
  const [validateAction, setValidateAction] = useState(true);
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
        promptVersion,
        mode,
        validateAction,
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto_auto_auto_auto]">
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
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
            Prompt
            <select
              value={promptVersion}
              onChange={(e) => setPromptVersion(e.target.value as "v2" | "v3" | "v4" | "v5")}
              disabled={isPending || mode !== "single"}
              className="rounded-md border border-border/60 bg-background px-2 py-2 text-[13px] disabled:opacity-50"
            >
              <option value="v2">v2 — vier-eis</option>
              <option value="v3">v3 — drie-vragen</option>
              <option value="v4">v4 — voorbeeld-zwaar</option>
              <option value="v5">v5 — voorbeeld-zwaar + sales-nuance</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
            Mode
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "single" | "two-stage" | "spotter-only")}
              disabled={isPending}
              className="rounded-md border border-border/60 bg-background px-2 py-2 text-[13px]"
            >
              <option value="single">single-call</option>
              <option value="two-stage">two-stage (spotter + judge)</option>
              <option value="spotter-only">spotter-only (Haiku)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
            Validator
            <label className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-2 text-[13px]">
              <input
                type="checkbox"
                checked={validateAction}
                onChange={(e) => setValidateAction(e.target.checked)}
                disabled={isPending}
              />
              <span>action-validator (Haiku)</span>
            </label>
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
