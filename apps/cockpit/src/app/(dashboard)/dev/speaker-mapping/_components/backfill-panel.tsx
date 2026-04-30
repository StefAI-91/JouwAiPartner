"use client";

import { useState, useTransition } from "react";
import { formatDate } from "@repo/ui/format";
import {
  getSpeakerMappingBackfillStatus,
  runSpeakerMappingBackfillBatch,
  type BackfillBatchItem,
  type BackfillStatus,
} from "@/actions/dev-speaker-mapping";
import { Stat } from "./stat";

export function BackfillPanel({ initialStatus }: { initialStatus: BackfillStatus | null }) {
  const [status, setStatus] = useState<BackfillStatus | null>(initialStatus);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [limit, setLimit] = useState(5);
  const [force, setForce] = useState(false);
  const [items, setItems] = useState<BackfillBatchItem[]>([]);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refreshStatus = () => {
    startTransition(async () => {
      const res = await getSpeakerMappingBackfillStatus();
      if ("error" in res) {
        setStatusError(res.error);
      } else {
        setStatus(res);
        setStatusError(null);
      }
    });
  };

  const runBatch = () => {
    setBatchError(null);
    startTransition(async () => {
      const res = await runSpeakerMappingBackfillBatch({ limit, force });
      if ("error" in res) {
        setBatchError(res.error);
        return;
      }
      // Append nieuwe items bovenaan; eerste batch overschrijft eerdere ronde
      // niet.
      setItems((prev) => [...res.items, ...prev]);
      // Refresh status meteen mee zodat counter niet stale blijft.
      const next = await getSpeakerMappingBackfillStatus();
      if (!("error" in next)) setStatus(next);
    });
  };

  const remaining = status ? status.without_named : null;

  return (
    <section className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Backfill named-transcripten</h2>
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            Draai de speaker-mapping in batches over bestaande meetings. Elke batch verwerkt
            meetings serieel — Haiku-call per meeting. Stop wanneer je tevreden bent over de
            resultaten boven.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshStatus}
          disabled={isPending}
          className="rounded-md border border-border/60 px-2 py-1 text-[11px] hover:bg-muted disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {statusError && <p className="mt-2 text-[12px] text-rose-700">Status fout: {statusError}</p>}

      {status && (
        <dl className="mt-3 grid grid-cols-3 gap-x-4 text-[12px]">
          <Stat label="Met ElevenLabs" value={status.with_elevenlabs.toLocaleString("nl-NL")} />
          <Stat label="Al gemapped" value={status.with_named.toLocaleString("nl-NL")} />
          <Stat label="Nog te doen" value={status.without_named.toLocaleString("nl-NL")} />
        </dl>
      )}

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[auto_auto_1fr_auto] md:items-end">
        <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
          Batch-limit
          <input
            type="number"
            min={1}
            max={20}
            step={1}
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value, 10) || 5)}
            disabled={isPending}
            className="w-24 rounded-md border border-border/60 bg-background px-2 py-2 text-[13px]"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
          Forceer
          <label className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-2 text-[13px]">
            <input
              type="checkbox"
              checked={force}
              onChange={(e) => setForce(e.target.checked)}
              disabled={isPending}
            />
            <span>Ook al gemapped</span>
          </label>
        </label>
        <p className="text-[11px] text-muted-foreground">
          {remaining !== null && remaining > 0
            ? `Nog ${remaining.toLocaleString("nl-NL")} meetings te verwerken (zonder force).`
            : remaining === 0 && !force
              ? 'Alles is gemapped. Vink "Forceer" aan om opnieuw te mappen.'
              : null}
        </p>
        <button
          type="button"
          onClick={runBatch}
          disabled={isPending || (remaining === 0 && !force)}
          className="rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Bezig…" : "Volgende batch"}
        </button>
      </div>

      {batchError && (
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-[12px] text-rose-900">
          {batchError}
        </p>
      )}

      {items.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-[12px]">
          {items.map((item, i) => (
            <BackfillResultRow key={`${item.meeting_id}-${i}`} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

function BackfillResultRow({ item }: { item: BackfillBatchItem }) {
  const colorClass =
    item.status === "mapped_full"
      ? "border-emerald-200 bg-emerald-50"
      : item.status === "mapped_partial"
        ? "border-amber-200 bg-amber-50"
        : item.status === "no_speakers"
          ? "border-slate-200 bg-slate-50"
          : "border-rose-200 bg-rose-50";
  const icon =
    item.status === "mapped_full"
      ? "✓"
      : item.status === "mapped_partial"
        ? "◐"
        : item.status === "no_speakers"
          ? "—"
          : "✗";

  return (
    <li className={`rounded-md border p-2 ${colorClass}`}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-mono font-bold">{icon}</span>
        <span className="font-medium">{item.title ?? "(geen titel)"}</span>
        <span className="text-[10.5px] text-muted-foreground">{formatDate(item.date)}</span>
        {item.speaker_count > 0 && (
          <span className="ml-auto text-[10.5px] text-muted-foreground">
            {item.mapped_count}/{item.speaker_count} speakers
          </span>
        )}
      </div>
      {item.message && <p className="mt-0.5 text-[11px] text-muted-foreground">{item.message}</p>}
    </li>
  );
}
