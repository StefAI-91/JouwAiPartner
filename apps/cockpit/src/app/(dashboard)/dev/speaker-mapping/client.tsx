"use client";

import { useState, useTransition } from "react";
import { formatDate } from "@repo/ui/format";
import {
  runSpeakerMappingAction,
  type BackfillStatus,
  type RunSpeakerMappingResult,
  type SpeakerMappingMeetingOption,
} from "@/actions/dev-speaker-mapping";
import { BackfillPanel } from "./_components/backfill-panel";
import { ResultPanel } from "./_components/result-panel";

interface Props {
  meetings: SpeakerMappingMeetingOption[];
  initialBackfillStatus: BackfillStatus | null;
}

export function SpeakerMappingClient({ meetings, initialBackfillStatus }: Props) {
  const [selectedId, setSelectedId] = useState<string>(meetings[0]?.id ?? "");
  const [perSpeaker, setPerSpeaker] = useState(10);
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
              onChange={(e) => setPerSpeaker(parseInt(e.target.value, 10) || 10)}
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

      <BackfillPanel initialStatus={initialBackfillStatus} />
    </div>
  );
}
