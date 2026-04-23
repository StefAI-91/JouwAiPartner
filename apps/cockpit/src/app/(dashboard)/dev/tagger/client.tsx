"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge } from "@repo/ui/badge";
import { formatDate } from "@repo/ui/format";
import { runDevTaggerAction } from "@/actions/dev-tagger";
import type { DevTaggerResult } from "@/actions/dev-tagger";

type MeetingOption = { id: string; title: string; date: string | null };

type MatchDiff =
  | {
      status: "new";
      themeId: string;
      confidence: "medium" | "high";
      evidenceQuote: string;
      extractionIds: string[];
    }
  | { status: "removed"; themeId: string; confidence: "medium" | "high"; evidenceQuote: string }
  | {
      status: "same";
      themeId: string;
      confidence: "medium" | "high";
      evidenceQuote: string;
      extractionIds: string[];
    };

interface Props {
  meetings: MeetingOption[];
}

/**
 * TH-010 (UI-320 + UI-321) — Dry-run harness UI. Picker + Run-knop +
 * input-panel (counts + theme-context) + output-panel (matches / proposals /
 * meta) + diff-panel (huidige DB vs fresh output) + collapsible system-prompt
 * viewer. Geen persistente state; refresh reset alles.
 */
export function DevTaggerClient({ meetings }: Props) {
  const [selectedId, setSelectedId] = useState<string>(meetings[0]?.id ?? "");
  const [result, setResult] = useState<DevTaggerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const runTagger = () => {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      const res = await runDevTaggerAction({ meetingId: selectedId });
      if ("error" in res) {
        setError(res.error);
        setResult(null);
      } else {
        setResult(res);
      }
    });
  };

  const matchDiff: MatchDiff[] = useMemo(() => {
    if (!result) return [];
    const current = new Map(
      result.currentMeetingThemes.map((m) => [
        m.theme_id,
        { confidence: m.confidence, evidenceQuote: m.evidence_quote },
      ]),
    );
    const fresh = new Map(
      result.taggerOutput.matches.map((m) => [
        m.themeId,
        {
          confidence: m.confidence,
          evidenceQuote: m.evidenceQuote,
          extractionIds: m.extractionIds,
        },
      ]),
    );

    const diff: MatchDiff[] = [];
    for (const [themeId, f] of fresh) {
      if (current.has(themeId)) {
        diff.push({
          status: "same",
          themeId,
          confidence: f.confidence,
          evidenceQuote: f.evidenceQuote,
          extractionIds: f.extractionIds,
        });
      } else {
        diff.push({
          status: "new",
          themeId,
          confidence: f.confidence,
          evidenceQuote: f.evidenceQuote,
          extractionIds: f.extractionIds,
        });
      }
    }
    for (const [themeId, c] of current) {
      if (!fresh.has(themeId)) {
        diff.push({
          status: "removed",
          themeId,
          confidence: c.confidence,
          evidenceQuote: c.evidenceQuote,
        });
      }
    }
    return diff;
  }, [result]);

  const themeLabelById = useMemo(() => {
    if (!result) return new Map<string, string>();
    const map = new Map<string, string>();
    // Primaire bron: alle themes die aan de Tagger zijn meegegeven (verified
    // catalogus). Valt terug op currentMeetingThemes voor archived matches
    // die niet meer in listVerifiedThemes zitten.
    for (const t of result.themesLookup) {
      map.set(t.themeId, `${t.emoji} ${t.name}`);
    }
    for (const m of result.currentMeetingThemes) {
      if (!map.has(m.theme_id)) map.set(m.theme_id, `${m.theme_emoji} ${m.theme_name}`);
    }
    return map;
  }, [result]);

  const extractionById = useMemo(() => {
    if (!result) return new Map<string, { type: string; content: string }>();
    return new Map(
      result.inputExtractions.map((e) => [e.id, { type: e.type, content: e.content }]),
    );
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
          onClick={runTagger}
          disabled={isPending || !selectedId}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {isPending ? "Taggen…" : "Run Tagger"}
        </button>
      </div>

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
              <Stat label="Extractions (totaal)" value={result.inputSummary.extractionsTotal} />
              <Stat label="Na type-filter" value={result.inputSummary.extractionsAfterTypeFilter} />
              <Stat label="Themes" value={result.inputSummary.themesCount} />
              <Stat label="Negative examples" value={result.inputSummary.negativeExamplesCount} />
            </dl>
            {result.inputSummary.extractionsAfterTypeFilter === 0 && (
              <p className="mt-3 rounded-md border border-dashed border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                Geen extractions om te taggen (starter-set types: decision / action_item / need /
                insight). De Tagger-step wordt in de pipeline geskipt.
              </p>
            )}
            {result.inputSummary.themesCount === 0 && (
              <p className="mt-3 rounded-md border border-dashed border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                Geen themes beschikbaar — de Tagger heeft niks om tegen te matchen.
              </p>
            )}
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
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold hover:underline">
                Transcript{" "}
                <span className="font-normal text-muted-foreground">
                  ({result.meetingContext.transcript?.length ?? 0} chars)
                </span>
              </summary>
              {result.meetingContext.transcript ? (
                <pre className="mt-2 max-h-[480px] overflow-auto rounded-md bg-muted/40 p-3 text-[11.5px] leading-relaxed whitespace-pre-wrap">
                  {result.meetingContext.transcript}
                </pre>
              ) : (
                <p className="mt-2 text-[11.5px] text-muted-foreground">
                  (geen transcript beschikbaar — Tagger ziet alleen de summary)
                </p>
              )}
            </details>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-4">
            <h2 className="text-sm font-semibold">
              Output — Matches ({result.taggerOutput.matches.length})
            </h2>
            {result.taggerOutput.matches.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Geen matches.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-[12.5px]">
                {result.taggerOutput.matches.map((m, i) => (
                  <li
                    key={`${m.themeId}-${i}`}
                    className="rounded-md border border-border/40 bg-background p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={m.confidence === "high" ? "default" : "secondary"}>
                        {m.confidence}
                      </Badge>
                      <span className="text-[13px] font-semibold">
                        {themeLabelById.get(m.themeId) ?? m.themeId}
                      </span>
                      <code className="font-mono text-[10px] text-muted-foreground">
                        {m.themeId}
                      </code>
                    </div>
                    <blockquote className="mt-2 border-l-2 border-primary/30 pl-3 italic text-muted-foreground">
                      &ldquo;{m.evidenceQuote}&rdquo;
                    </blockquote>
                    <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      extractionIds ({m.extractionIds.length})
                    </p>
                    {m.extractionIds.length === 0 ? (
                      <p className="mt-1 ml-3 text-[11.5px] text-muted-foreground">
                        LLM gaf géén geldige extractionIds terug (of ze werden als
                        non-UUID/hallucinatie gestript — check server-logs).
                      </p>
                    ) : (
                      <ul className="mt-1 ml-3 list-disc space-y-0.5 text-[11.5px]">
                        {m.extractionIds.map((id) => {
                          const ex = extractionById.get(id);
                          return (
                            <li key={id}>
                              {ex ? (
                                <>
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {ex.type}:
                                  </span>{" "}
                                  <span>{ex.content}</span>
                                </>
                              ) : (
                                <code className="text-[11px]">{id}</code>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-4">
            <h2 className="text-sm font-semibold">
              Output — Proposals ({result.taggerOutput.proposals.length})
            </h2>
            {result.taggerOutput.proposals.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Geen proposals.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-[12.5px]">
                {result.taggerOutput.proposals.map((p, i) => (
                  <li key={i} className="rounded-md border border-border/40 bg-background p-3">
                    <div className="font-semibold">
                      {p.emoji} {p.name}
                    </div>
                    <p className="mt-1 text-muted-foreground">{p.description}</p>
                    <blockquote className="mt-2 border-l-2 border-primary/30 pl-3 italic text-muted-foreground">
                      &ldquo;{p.evidenceQuote}&rdquo;
                    </blockquote>
                    <p className="mt-2 text-[11px] text-muted-foreground">{p.reasoning}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-4">
            <h2 className="text-sm font-semibold">Diff met DB</h2>
            {matchDiff.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Geen themes betrokken.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-[12.5px]">
                {matchDiff.map((d) => (
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
            <h2 className="text-sm font-semibold">Meta</h2>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[12.5px] md:grid-cols-4">
              <Stat label="themesConsidered" value={result.taggerOutput.meta.themesConsidered} />
              {result.taggerOutput.meta.skipped && (
                <Stat label="skipped" value={result.taggerOutput.meta.skipped} />
              )}
            </dl>
          </section>
        </>
      )}

      {result && (
        <section className="rounded-xl border border-border/60 bg-card p-4">
          <details open>
            <summary className="cursor-pointer text-sm font-semibold hover:underline">
              System prompt ({result.systemPrompt.length} chars)
            </summary>
            <pre className="mt-3 max-h-[600px] overflow-auto rounded-md bg-muted/50 p-3 text-[11.5px] leading-relaxed whitespace-pre-wrap">
              {result.systemPrompt}
            </pre>
          </details>
        </section>
      )}

      {result && result.themesLookup.length > 0 && (
        <section className="rounded-xl border border-border/60 bg-card p-4">
          <details>
            <summary className="cursor-pointer text-sm font-semibold hover:underline">
              Themes catalog ({result.themesLookup.length}) — naam + omschrijving + matching_guide
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
                    <code className="font-mono text-[10px] text-muted-foreground">{t.themeId}</code>
                  </div>
                  <p className="mt-1 text-[12px]">{t.description}</p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    matching_guide
                  </p>
                  <p className="mt-0.5 text-[11.5px] whitespace-pre-wrap text-muted-foreground">
                    {t.matchingGuide}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        </section>
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
