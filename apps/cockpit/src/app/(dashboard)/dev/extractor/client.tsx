"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, Copy, Loader2, Shield, Sparkles } from "lucide-react";
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
      if ("error" in res) setError(res.error);
      else setResult(res);
    });
  }

  function handleRunSpecialist() {
    if (!meetingId) return;
    setError(null);
    setSpecialistResult(null);
    startSpecialistTransition(async () => {
      const res = await runDevRiskSpecialistAction({ meetingId });
      if ("error" in res) setError(res.error);
      else setSpecialistResult(res);
    });
  }

  async function handleTogglePrompt() {
    if (!showPrompt && !prompt) {
      const res = await getMeetingStructurerPromptAction();
      if ("error" in res) setError(res.error);
      else setPrompt(res.prompt);
    }
    setShowPrompt((v) => !v);
  }

  async function handleToggleSpecialistPrompt() {
    if (!showSpecialistPrompt && !specialistPrompt) {
      const res = await getRiskSpecialistPromptAction();
      if ("error" in res) setError(res.error);
      else setSpecialistPrompt(res.prompt);
    }
    setShowSpecialistPrompt((v) => !v);
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
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

      {result && (
        <>
          {/* Briefing strip — context for all 3 panels */}
          <div className="rounded-lg bg-primary/5 px-4 py-3 text-sm leading-relaxed">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
              Fresh briefing (niet type-gefilterd)
            </p>
            <p className="text-foreground/85">{result.freshBriefing}</p>
          </div>

          {/* 3-panel diff */}
          <div className="grid gap-3 md:grid-cols-3">
            <Panel title="Transcript" copyValue={result.transcript}>
              <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground/80 select-text">
                {result.transcript}
              </pre>
            </Panel>

            <Panel
              title={`DB — type="${type}"`}
              count={result.currentInDb.length}
              copyValue={JSON.stringify(result.currentInDb, null, 2)}
            >
              {result.currentInDb.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">
                  Niets opgeslagen voor dit type.
                </p>
              ) : (
                <ul className="space-y-2">
                  {result.currentInDb.map((row) => (
                    <li key={row.id} className="rounded border bg-background p-2 text-xs">
                      <p className="leading-snug">{row.content}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        conf {row.confidence?.toFixed(2) ?? "—"} · {summariseMetadata(row.metadata)}
                      </p>
                      <details className="mt-1.5">
                        <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
                          raw metadata
                        </summary>
                        <pre className="mt-1 overflow-auto rounded bg-muted/30 p-2 text-[10px] leading-snug">
                          {JSON.stringify(row.metadata, null, 2)}
                        </pre>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title={`Fresh — type="${type}"`}
              count={result.freshOutput.length}
              accent
              copyValue={JSON.stringify(result.freshOutput, null, 2)}
            >
              {result.freshOutput.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">
                  Agent emit geen items van dit type op deze meeting.
                </p>
              ) : (
                <ul className="space-y-2">
                  {result.freshOutput.map((k, i) => (
                    <li
                      key={i}
                      className="rounded border border-primary/30 bg-primary/5 p-2 text-xs"
                    >
                      <p className="leading-snug">{k.content}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        conf {k.confidence.toFixed(2)} · {summariseMetadata(k.metadata)}
                      </p>
                      {k.source_quote && (
                        <blockquote className="mt-1 border-l-2 border-muted pl-2 text-[10px] italic text-muted-foreground">
                          {k.source_quote}
                        </blockquote>
                      )}
                      <details className="mt-1.5">
                        <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
                          raw JSON
                        </summary>
                        <pre className="mt-1 overflow-auto rounded bg-background p-2 text-[10px] leading-snug">
                          {JSON.stringify(
                            {
                              theme: k.theme,
                              theme_project: k.theme_project,
                              project: k.project,
                              confidence: k.confidence,
                              source_quote: k.source_quote,
                              metadata: k.metadata,
                            },
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}

      {specialistResult && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-2 text-xs">
            <p className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              <Shield className="size-3.5" /> RiskSpecialist A/B
            </p>
            <span className="text-muted-foreground">
              prompt {specialistResult.promptVersion} · Sonnet 4.6 high
            </span>
            <span className="text-muted-foreground">{specialistResult.metrics.latency_ms}ms</span>
            <span className="text-muted-foreground">
              in {specialistResult.metrics.input_tokens ?? "?"}t · out{" "}
              {specialistResult.metrics.output_tokens ?? "?"}t · reason{" "}
              {specialistResult.metrics.reasoning_tokens ?? "?"}t
            </span>
            <span className="ml-auto font-medium">
              Specialist: {specialistResult.freshRisks.length} risks · DB (structurer):{" "}
              {specialistResult.currentInDb.length}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Panel title="Transcript" copyValue={specialistResult.transcript}>
              <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground/80 select-text">
                {specialistResult.transcript}
              </pre>
            </Panel>

            <Panel
              title="Structurer-risks (in DB)"
              count={specialistResult.currentInDb.length}
              copyValue={JSON.stringify(specialistResult.currentInDb, null, 2)}
            >
              {specialistResult.currentInDb.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">
                  Geen risks in DB voor deze meeting.
                </p>
              ) : (
                <ul className="space-y-2">
                  {specialistResult.currentInDb.map((row) => (
                    <li key={row.id} className="rounded border bg-background p-2 text-xs">
                      <p className="leading-snug">{row.content}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        conf {row.confidence?.toFixed(2) ?? "—"} · {summariseMetadata(row.metadata)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="RiskSpecialist-risks (fresh)"
              count={specialistResult.freshRisks.length}
              accent
              copyValue={JSON.stringify(specialistResult.freshRisks, null, 2)}
            >
              {specialistResult.freshRisks.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">
                  RiskSpecialist emit geen risks voor deze meeting.
                </p>
              ) : (
                <ul className="space-y-2">
                  {specialistResult.freshRisks.map((r, i) => (
                    <li
                      key={i}
                      className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-xs"
                    >
                      <p className="leading-snug">{r.content}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        conf {r.confidence.toFixed(2)} ·{" "}
                        {summariseMetadata(r.metadata as Record<string, unknown>)}
                      </p>
                      {r.source_quote && (
                        <blockquote className="mt-1 border-l-2 border-muted pl-2 text-[10px] italic text-muted-foreground">
                          {r.source_quote}
                        </blockquote>
                      )}
                      <details className="mt-1.5">
                        <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
                          raw JSON
                        </summary>
                        <pre className="mt-1 overflow-auto rounded bg-background p-2 text-[10px] leading-snug">
                          {JSON.stringify(r, null, 2)}
                        </pre>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({
  title,
  count,
  accent,
  copyValue,
  children,
}: {
  title: string;
  count?: number;
  accent?: boolean;
  copyValue?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex max-h-[600px] flex-col overflow-hidden rounded-xl bg-card ring-1 ${
        accent ? "ring-primary/30" : "ring-foreground/10"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <p className="text-xs font-semibold">{title}</p>
        <div className="flex items-center gap-2">
          {count !== undefined && (
            <span className="text-[10px] text-muted-foreground">{count}</span>
          )}
          {copyValue && <CopyButton value={copyValue} />}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">{children}</div>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback voor oudere browsers / insecure origins
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(ta);
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
      aria-label="Kopieer naar klembord"
    >
      {copied ? (
        <>
          <Check className="size-3 text-green-600" />
          Gekopieerd
        </>
      ) : (
        <>
          <Copy className="size-3" />
          Kopieer
        </>
      )}
    </button>
  );
}

function formatMeetingOption(m: MeetingOption): string {
  const date = m.date ? new Date(m.date).toLocaleDateString("nl-NL") : "—";
  const title = m.title ?? "Zonder titel";
  return `${date} · ${title}${m.meeting_type ? ` (${m.meeting_type})` : ""}`;
}

function summariseMetadata(meta: Record<string, unknown>): string {
  const entries = Object.entries(meta).filter(
    ([k, v]) => v !== null && v !== undefined && k !== "theme",
  );
  if (entries.length === 0) return "geen metadata";
  return entries
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ");
}
