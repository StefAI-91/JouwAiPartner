"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge } from "@repo/ui/badge";
import { formatDate } from "@repo/ui/format";
import { runDevDetectorAction } from "@/actions/dev-detector";
import type { DevDetectorResult } from "@/actions/dev-detector";
import { CreateThemeForm } from "./create-theme-form";

type MeetingOption = { id: string; title: string; date: string | null };

type DiffEntry =
  | { status: "new"; themeId: string; confidence: "medium" | "high"; evidenceQuote: string }
  | { status: "removed"; themeId: string; confidence: "medium" | "high"; evidenceQuote: string }
  | { status: "same"; themeId: string; confidence: "medium" | "high"; evidenceQuote: string };

interface Props {
  meetings: MeetingOption[];
}

/**
 * TH-011 (FUNC-279, UI-320..321 opnieuw opgeleverd) — Dry-run harness
 * voor de Theme-Detector. Picker + Run-knop + input-panel + output-panel
 * (identified_themes + proposed_themes) + diff-panel (huidige DB vs.
 * fresh output). Full-pipeline mode (UI-333/334/335) komt als fase 6b.
 */
export function DevDetectorClient({ meetings }: Props) {
  const [selectedId, setSelectedId] = useState<string>(meetings[0]?.id ?? "");
  const [result, setResult] = useState<DevDetectorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const runDetector = () => {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      const res = await runDevDetectorAction({ meetingId: selectedId });
      if ("error" in res) {
        setError(res.error);
        setResult(null);
      } else {
        setResult(res);
      }
    });
  };

  const themeLabelById = useMemo(() => {
    if (!result) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const t of result.themesLookup) map.set(t.themeId, `${t.emoji} ${t.name}`);
    for (const m of result.currentMeetingThemes) {
      if (!map.has(m.theme_id)) map.set(m.theme_id, `${m.theme_emoji} ${m.theme_name}`);
    }
    return map;
  }, [result]);

  const diff: DiffEntry[] = useMemo(() => {
    if (!result) return [];
    const current = new Map(
      result.currentMeetingThemes.map((m) => [
        m.theme_id,
        { confidence: m.confidence, evidenceQuote: m.evidence_quote },
      ]),
    );
    const fresh = new Map(
      result.detectorOutput.identified_themes.map((t) => [
        t.themeId,
        { confidence: t.confidence, evidenceQuote: t.relevance_quote },
      ]),
    );
    const out: DiffEntry[] = [];
    for (const [themeId, f] of fresh) {
      out.push({
        status: current.has(themeId) ? "same" : "new",
        themeId,
        confidence: f.confidence,
        evidenceQuote: f.evidenceQuote,
      });
    }
    for (const [themeId, c] of current) {
      if (!fresh.has(themeId)) {
        out.push({
          status: "removed",
          themeId,
          confidence: c.confidence,
          evidenceQuote: c.evidenceQuote,
        });
      }
    }
    return out;
  }, [result]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-card p-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Meeting
          <select
            className="min-w-[360px] rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={isPending}
          >
            {meetings.length === 0 ? (
              <option>(geen verified meetings)</option>
            ) : (
              meetings.map((m) => (
                <option key={m.id} value={m.id}>
                  {formatDate(m.date)} — {m.title}
                </option>
              ))
            )}
          </select>
        </label>
        <button
          type="button"
          onClick={runDetector}
          disabled={isPending || !selectedId}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {isPending ? "Detecting…" : "Run Detector"}
        </button>
      </div>

      <CreateThemeForm />

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <>
          <section className="rounded-xl border border-border/60 bg-card p-4">
            <h2 className="text-sm font-semibold">Input</h2>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[12.5px] md:grid-cols-4">
              <Stat label="Meeting_type" value={result.meetingContext.meetingType ?? "—"} />
              <Stat label="Party_type" value={result.meetingContext.partyType ?? "—"} />
              <Stat label="Themes" value={result.inputSummary.themesCount} />
              <Stat label="Negative examples" value={result.inputSummary.negativeExamplesCount} />
              <Stat label="Participants" value={result.meetingContext.participants.length} />
              <Stat
                label="Identified projects"
                value={result.inputSummary.identifiedProjectsCount}
              />
              <Stat label="Model" value={result.model} />
              <Stat label="Prompt version" value={result.promptVersion} />
            </dl>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-4">
            <h2 className="text-sm font-semibold">Meeting</h2>
            <p className="mt-1 text-[13px] font-semibold">{result.meetingContext.title}</p>
            {result.meetingContext.date && (
              <p className="text-[11px] text-muted-foreground">
                {formatDate(result.meetingContext.date)}
              </p>
            )}
            <details className="mt-3" open>
              <summary className="cursor-pointer text-xs font-semibold hover:underline">
                Summary{" "}
                <span className="font-normal text-muted-foreground">
                  ({result.meetingContext.summary?.length ?? 0} chars)
                </span>
              </summary>
              {result.meetingContext.summary ? (
                <pre className="mt-2 max-h-[320px] overflow-auto rounded-md bg-muted/40 p-3 text-[11.5px] leading-relaxed whitespace-pre-wrap">
                  {result.meetingContext.summary}
                </pre>
              ) : (
                <p className="mt-2 text-[11.5px] text-muted-foreground">(geen summary)</p>
              )}
            </details>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-4">
            <h2 className="text-sm font-semibold">
              Identified themes ({result.detectorOutput.identified_themes.length})
            </h2>
            {result.detectorOutput.identified_themes.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Geen identified themes.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-[12.5px]">
                {result.detectorOutput.identified_themes.map((t, i) => (
                  <li
                    key={`${t.themeId}-${i}`}
                    className="rounded-md border border-border/40 bg-background p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={t.confidence === "high" ? "default" : "secondary"}>
                        {t.confidence}
                      </Badge>
                      <span className="text-[13px] font-semibold">
                        {themeLabelById.get(t.themeId) ?? t.themeId}
                      </span>
                      <code className="font-mono text-[10px] text-muted-foreground">
                        {t.themeId}
                      </code>
                    </div>
                    <blockquote className="mt-2 border-l-2 border-primary/30 pl-3 italic text-muted-foreground">
                      &ldquo;{t.relevance_quote}&rdquo;
                    </blockquote>
                    <div className="mt-2 rounded-md bg-muted/30 p-2">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        theme_summary (fallback — sinds TH-013)
                      </p>
                      <p className="mt-0.5 text-[12px] leading-snug">
                        {t.theme_summary || (
                          <span className="italic text-muted-foreground">(leeg)</span>
                        )}
                      </p>
                      <p className="mt-1 text-[10px] italic text-muted-foreground">
                        De rijke versie (briefing + kernpunten + vervolgstappen) wordt door de
                        Summarizer geleverd bij de volle pipeline-run; deze detector-output landt
                        alleen in <code>meeting_themes.summary</code> wanneer de Summarizer faalt.
                      </p>
                    </div>
                    <div className="mt-2 rounded-md bg-muted/30 p-2">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        substantialityEvidence
                      </p>
                      <div className="mt-0.5 flex flex-wrap gap-3 text-[11.5px]">
                        {t.substantialityEvidence.extractionCount !== undefined && (
                          <span>kernpunten: {t.substantialityEvidence.extractionCount}</span>
                        )}
                        {t.substantialityEvidence.wordCount !== undefined && (
                          <span>woorden: {t.substantialityEvidence.wordCount}</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[12px] italic leading-snug">
                        {t.substantialityEvidence.reason}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-4">
            <h2 className="text-sm font-semibold">
              Proposed themes ({result.detectorOutput.proposed_themes.length})
            </h2>
            {result.detectorOutput.proposed_themes.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Geen proposals.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-[12.5px]">
                {result.detectorOutput.proposed_themes.map((p, i) => (
                  <li key={i} className="rounded-md border border-border/40 bg-background p-3">
                    <div className="font-semibold">
                      {p.emoji} {p.name}
                    </div>
                    <p className="mt-1 text-muted-foreground">{p.description}</p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      matching_guide
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-[11.5px]">{p.matching_guide}</p>
                    <blockquote className="mt-2 border-l-2 border-primary/30 pl-3 italic text-muted-foreground">
                      &ldquo;{p.evidence_quote}&rdquo;
                    </blockquote>
                    <p className="mt-2 text-[11px] text-muted-foreground">{p.rationale}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-4">
            <h2 className="text-sm font-semibold">Diff met DB</h2>
            {diff.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Geen themes betrokken.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-[12.5px]">
                {diff.map((d) => (
                  <li key={`${d.status}-${d.themeId}`} className="flex items-start gap-2">
                    <span
                      className={
                        d.status === "new"
                          ? "font-mono text-emerald-600"
                          : d.status === "removed"
                            ? "font-mono text-destructive"
                            : "font-mono text-muted-foreground"
                      }
                    >
                      {d.status === "new" ? "+" : d.status === "removed" ? "−" : "="}
                    </span>
                    <span className="flex-1">
                      <span className="font-medium">
                        {themeLabelById.get(d.themeId) ?? d.themeId}
                      </span>{" "}
                      <span className="text-muted-foreground">({d.confidence})</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground">
              Huidige extraction_themes: {result.currentExtractionThemes.length} rijen.
            </p>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-4">
            <details>
              <summary className="cursor-pointer text-sm font-semibold hover:underline">
                System prompt ({result.systemPrompt.length} chars)
              </summary>
              <pre className="mt-3 max-h-[600px] overflow-auto rounded-md bg-muted/50 p-3 text-[11.5px] leading-relaxed whitespace-pre-wrap">
                {result.systemPrompt}
              </pre>
            </details>
          </section>

          {result.themesLookup.length > 0 && (
            <section className="rounded-xl border border-border/60 bg-card p-4">
              <details>
                <summary className="cursor-pointer text-sm font-semibold hover:underline">
                  Themes catalog ({result.themesLookup.length})
                </summary>
                <ul className="mt-3 space-y-3 text-[12px]">
                  {result.themesLookup.map((t) => (
                    <li
                      key={t.themeId}
                      className="rounded-md border border-border/40 bg-background p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold">
                          {t.emoji} {t.name}
                        </span>
                        <code className="font-mono text-[10px] text-muted-foreground">
                          {t.themeId}
                        </code>
                      </div>
                      <p className="mt-1 text-[12px]">{t.description}</p>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        matching_guide
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap text-[11.5px] text-muted-foreground">
                        {t.matchingGuide}
                      </p>
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm">{value}</dd>
    </div>
  );
}
