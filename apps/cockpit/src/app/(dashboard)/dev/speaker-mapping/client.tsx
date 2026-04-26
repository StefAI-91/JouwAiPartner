"use client";

import { useState, useTransition } from "react";
import { formatDate } from "@repo/ui/format";
import {
  runSpeakerMappingAction,
  type RunSpeakerMappingResult,
  type SpeakerMappingMeetingOption,
} from "@/actions/dev-speaker-mapping";

interface Props {
  meetings: SpeakerMappingMeetingOption[];
}

export function SpeakerMappingClient({ meetings }: Props) {
  const [selectedId, setSelectedId] = useState<string>(meetings[0]?.id ?? "");
  const [perSpeaker, setPerSpeaker] = useState(6);
  const [result, setResult] = useState<RunSpeakerMappingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = () => {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      const res = await runSpeakerMappingAction({ meetingId: selectedId, perSpeaker });
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
            Meeting
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={isPending}
              className="rounded-md border border-border/60 bg-background px-3 py-2 text-[13px]"
            >
              {meetings.map((m) => (
                <option key={m.id} value={m.id}>
                  {formatDate(m.date)} — {m.title ?? "(geen titel)"}
                  {m.meeting_type ? ` · ${m.meeting_type}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
            Samples / speaker
            <input
              type="number"
              min={1}
              max={20}
              step={1}
              value={perSpeaker}
              onChange={(e) => setPerSpeaker(parseInt(e.target.value, 10) || 6)}
              className="w-24 rounded-md border border-border/60 bg-background px-2 py-2 text-[13px]"
            />
          </label>
          <button
            type="button"
            onClick={run}
            disabled={isPending || !selectedId}
            className="self-end rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Bezig…" : "Run Haiku"}
          </button>
        </div>
      </section>

      {error && (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {error}
        </section>
      )}

      {result && <ResultPanel result={result} />}
    </div>
  );
}

function ResultPanel({ result }: { result: RunSpeakerMappingResult }) {
  const { meetingContext, mapping, debug, metrics, systemPrompt } = result;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="text-sm font-semibold">Run-info</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] md:grid-cols-4">
          <Stat label="Title" value={meetingContext.title} />
          <Stat label="Datum" value={meetingContext.date ?? "—"} />
          <Stat label="Bron" value={meetingContext.transcript_source ?? "—"} />
          <Stat
            label="Transcript chars"
            value={meetingContext.transcript_length.toLocaleString("nl-NL")}
          />
          <Stat label="Speakers" value={debug.speaker_ids.length} />
          <Stat label="Latency" value={`${metrics.latency_ms} ms`} />
          <Stat label="Input tokens" value={metrics.input_tokens ?? "—"} />
          <Stat label="Output tokens" value={metrics.output_tokens ?? "—"} />
        </dl>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="text-sm font-semibold">Mapping</h2>
        <ul className="mt-3 space-y-2 text-[12.5px]">
          {mapping.mappings.map((m) => (
            <li
              key={m.speaker_id}
              className={`rounded-md border p-3 ${
                m.person_name
                  ? m.confidence >= 0.85
                    ? "border-emerald-200 bg-emerald-50"
                    : m.confidence >= 0.6
                      ? "border-amber-200 bg-amber-50"
                      : "border-orange-200 bg-orange-50"
                  : "border-rose-200 bg-rose-50"
              }`}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono font-semibold">{m.speaker_id}</span>
                <span className="text-base">→</span>
                <span className="font-medium">
                  {m.person_name || <span className="italic text-muted-foreground">(onzeker)</span>}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  conf {m.confidence.toFixed(2)}
                </span>
              </div>
              <p className="mt-1 text-[11.5px] italic text-muted-foreground">
                <span className="font-semibold not-italic">reasoning:</span> {m.reasoning}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="text-sm font-semibold">Deelnemers (DB)</h2>
        <ul className="mt-2 space-y-1 text-[12px]">
          {meetingContext.participants.map((p) => (
            <li key={p.name}>
              <span className="font-medium">{p.name}</span>
              {p.organization && (
                <span className="text-muted-foreground">
                  {" — "}
                  {p.organization}
                  {p.organization_type ? ` (${p.organization_type})` : ""}
                </span>
              )}
              {p.role && <span className="text-muted-foreground"> · {p.role}</span>}
            </li>
          ))}
        </ul>
      </section>

      <details className="rounded-xl border border-border/60 bg-card p-4">
        <summary className="cursor-pointer text-sm font-semibold hover:underline">
          ElevenLabs-samples ({debug.speaker_ids.length} speakers)
        </summary>
        <div className="mt-3 space-y-3">
          {debug.speaker_ids.map((sid) => (
            <div key={sid}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {sid}
              </p>
              <ul className="mt-1 space-y-1 text-[11.5px]">
                {(debug.samples[sid] ?? []).map((u, i) => (
                  <li key={i} className="rounded-md bg-muted/50 p-2 italic">
                    &ldquo;{u}&rdquo;
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      {debug.fireflies_names.length > 0 && (
        <details className="rounded-xl border border-border/60 bg-card p-4">
          <summary className="cursor-pointer text-sm font-semibold hover:underline">
            Fireflies-samples ({debug.fireflies_names.length} named speakers)
          </summary>
          <div className="mt-3 space-y-3">
            {debug.fireflies_names.map((name) => (
              <div key={name}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {name}
                </p>
                <ul className="mt-1 space-y-1 text-[11.5px]">
                  {(debug.fireflies_samples[name] ?? []).map((u, i) => (
                    <li key={i} className="rounded-md bg-muted/50 p-2 italic">
                      &ldquo;{u}&rdquo;
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      )}

      <details className="rounded-xl border border-border/60 bg-card p-4">
        <summary className="cursor-pointer text-sm font-semibold hover:underline">
          User-message (raw input naar model)
        </summary>
        <pre className="mt-2 max-h-[400px] overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-[11px] leading-relaxed">
          {debug.user_message}
        </pre>
      </details>

      <details className="rounded-xl border border-border/60 bg-card p-4">
        <summary className="cursor-pointer text-sm font-semibold hover:underline">
          System prompt ({systemPrompt.length.toLocaleString("nl-NL")} chars)
        </summary>
        <pre className="mt-2 max-h-[500px] overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-[11px] leading-relaxed">
          {systemPrompt}
        </pre>
      </details>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-[12.5px]">{value}</dd>
    </div>
  );
}
