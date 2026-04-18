"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Loader2, Sparkles } from "lucide-react";
import {
  runDevExtractorAction,
  getMeetingStructurerPromptAction,
  type DevExtractorResult,
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
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isPending, startTransition] = useTransition();

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

  async function handleTogglePrompt() {
    if (!showPrompt && !prompt) {
      const res = await getMeetingStructurerPromptAction();
      if ("error" in res) setError(res.error);
      else setPrompt(res.prompt);
    }
    setShowPrompt((v) => !v);
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
          onClick={handleTogglePrompt}
          className="flex h-9 items-center gap-1 rounded-md border bg-background px-3 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={`size-3 transition-transform ${showPrompt ? "rotate-180" : ""}`}
          />
          System-prompt
        </button>
      </div>

      {showPrompt && prompt && (
        <pre className="max-h-80 overflow-auto rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed whitespace-pre-wrap">
          {prompt}
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
            <Panel title="Transcript">
              <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground/80">
                {result.transcript}
              </pre>
            </Panel>

            <Panel title={`DB — type="${type}"`} count={result.currentInDb.length}>
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
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title={`Fresh — type="${type}"`} count={result.freshOutput.length} accent>
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
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function Panel({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count?: number;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex max-h-[600px] flex-col overflow-hidden rounded-xl bg-card ring-1 ${
        accent ? "ring-primary/30" : "ring-foreground/10"
      }`}
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="text-xs font-semibold">{title}</p>
        {count !== undefined && <span className="text-[10px] text-muted-foreground">{count}</span>}
      </div>
      <div className="flex-1 overflow-auto p-3">{children}</div>
    </div>
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
