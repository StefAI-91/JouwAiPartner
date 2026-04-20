"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Loader2, Shield, Sparkles } from "lucide-react";
import {
  runDevExtractorAction,
  runDevRiskSpecialistAction,
  getMeetingStructurerPromptAction,
  getRiskSpecialistPromptAction,
  type DevExtractorResult,
  type DevRiskSpecialistResult,
} from "@/actions/dev-extractor";
import { ALL_EXTRACTION_TYPES } from "@repo/ai/extraction-types";
import type { ExtractionType } from "@repo/ai/extraction-types";
import { StructurerResultPanel } from "./structurer-result-panel";
import { SpecialistResultPanel } from "./specialist-result-panel";

interface MeetingOption {
  id: string;
  title: string | null;
  date: string | null;
  meeting_type: string | null;
}

export function DevExtractorClient({ meetings }: { meetings: MeetingOption[] }) {
  const [meetingId, setMeetingId] = useState(meetings[0]?.id ?? "");
  const [type, setType] = useState<ExtractionType>("risk");
  const [result, setResult] = useState<DevExtractorResult | null>(null);
  const [specialistResult, setSpecialistResult] = useState<DevRiskSpecialistResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [specialistPrompt, setSpecialistPrompt] = useState<string | null>(null);
  const [showSpecialistPrompt, setShowSpecialistPrompt] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSpecialistPending, startSpecialistTransition] = useTransition();

  function handleRun() {
    if (!meetingId) return;
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await runDevExtractorAction({ meetingId, type });
      if (!res.success) setError(res.error);
      else setResult(res.data);
    });
  }

  function handleRunSpecialist() {
    if (!meetingId) return;
    setError(null);
    setSpecialistResult(null);
    startSpecialistTransition(async () => {
      const res = await runDevRiskSpecialistAction({ meetingId });
      if (!res.success) setError(res.error);
      else setSpecialistResult(res.data);
    });
  }

  async function handleTogglePrompt() {
    if (!showPrompt && !prompt) {
      const res = await getMeetingStructurerPromptAction();
      if (!res.success) setError(res.error);
      else setPrompt(res.data.prompt);
    }
    setShowPrompt((v) => !v);
  }

  async function handleToggleSpecialistPrompt() {
    if (!showSpecialistPrompt && !specialistPrompt) {
      const res = await getRiskSpecialistPromptAction();
      if (!res.success) setError(res.error);
      else setSpecialistPrompt(res.data.prompt);
    }
    setShowSpecialistPrompt((v) => !v);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Meeting
          <select
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            className="min-w-64 rounded border bg-background px-2 py-1 text-sm"
          >
            {meetings.length === 0 && <option value="">Geen meetings met transcript</option>}
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {formatMeetingOption(m)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ExtractionType)}
            className="rounded border bg-background px-2 py-1 text-sm"
          >
            {ALL_EXTRACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={handleRun}
          disabled={isPending || !meetingId}
          className="flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {isPending ? "Bezig…" : "Run structurer"}
        </button>

        <button
          type="button"
          onClick={handleRunSpecialist}
          disabled={isSpecialistPending || !meetingId}
          className="flex h-9 items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 text-sm font-medium text-amber-900 transition-opacity hover:opacity-90 disabled:opacity-50 dark:text-amber-300"
          title="A/B-experiment: alleen risks, Sonnet 4.6 met high reasoning"
        >
          {isSpecialistPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Shield className="size-3.5" />
          )}
          {isSpecialistPending ? "Bezig…" : "Run RiskSpecialist"}
        </button>

        <button
          type="button"
          onClick={handleTogglePrompt}
          className="flex h-9 items-center gap-1 rounded-md border bg-background px-3 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={`size-3 transition-transform ${showPrompt ? "rotate-180" : ""}`}
          />
          Structurer-prompt
        </button>

        <button
          type="button"
          onClick={handleToggleSpecialistPrompt}
          className="flex h-9 items-center gap-1 rounded-md border bg-background px-3 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={`size-3 transition-transform ${showSpecialistPrompt ? "rotate-180" : ""}`}
          />
          RiskSpecialist-prompt
        </button>
      </div>

      {showPrompt && prompt && (
        <pre className="max-h-80 overflow-auto rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed whitespace-pre-wrap">
          {prompt}
        </pre>
      )}

      {showSpecialistPrompt && specialistPrompt && (
        <pre className="max-h-80 overflow-auto rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-[11px] leading-relaxed whitespace-pre-wrap">
          {specialistPrompt}
        </pre>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && <StructurerResultPanel result={result} type={type} />}

      {specialistResult && <SpecialistResultPanel result={specialistResult} />}
    </div>
  );
}

function formatMeetingOption(m: MeetingOption): string {
  const date = m.date ? new Date(m.date).toLocaleDateString("nl-NL") : "—";
  const title = m.title ?? "Zonder titel";
  return `${date} · ${title}${m.meeting_type ? ` (${m.meeting_type})` : ""}`;
}
