"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TopicLifecycleStatus } from "@repo/database/constants/topics";
import { updateTopicStatusAction } from "../actions/topics";

/**
 * 7 statuses in de fase 1-UI. `wont_do_proposed_by_client` zit hier
 * bewust NIET in — die landt pas in PR-010 (klant kan voorstellen
 * niet door te zetten via Portal). Volgorde is lifecycle-volgorde.
 */
const FASE_1_STATUSES: { value: TopicLifecycleStatus; label: string }[] = [
  { value: "clustering", label: "Clustering" },
  { value: "awaiting_client_input", label: "Wachten op klant" },
  { value: "prioritized", label: "Geprioriteerd" },
  { value: "scheduled", label: "Ingepland" },
  { value: "in_progress", label: "In uitvoering" },
  { value: "done", label: "Klaar" },
  { value: "wont_do", label: "Niet doen" },
];

interface TopicStatusSelectProps {
  topicId: string;
  current: TopicLifecycleStatus;
}

export function TopicStatusSelect({ topicId, current }: TopicStatusSelectProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<TopicLifecycleStatus>(current);

  const isWontDo = selected === "wont_do";
  const showReasonInput = isWontDo;

  function commit(next: TopicLifecycleStatus, providedReason?: string) {
    startTransition(async () => {
      setError(null);
      const payload: Record<string, unknown> = { id: topicId, status: next };
      if (next === "wont_do" && providedReason && providedReason.trim().length > 0) {
        payload.wont_do_reason = providedReason.trim();
      }
      const result = await updateTopicStatusAction(payload);
      if ("error" in result) {
        setError(result.error);
        setSelected(current);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Status</span>
        <select
          value={selected}
          onChange={(e) => {
            const next = e.target.value as TopicLifecycleStatus;
            setSelected(next);
            // Voor non-wont-do meteen committen; wont_do wacht op de reason-knop
            if (next !== "wont_do") {
              commit(next);
            }
          }}
          disabled={isPending}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {FASE_1_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      {showReasonInput ? (
        <div className="flex flex-col gap-1.5 rounded-md border border-border bg-muted/40 p-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Reden (optioneel in fase 1)</span>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Min. 10 tekens als je een reden invult."
              className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </label>
          <button
            type="button"
            disabled={isPending}
            onClick={() => commit("wont_do", reason)}
            className="inline-flex h-8 self-start items-center rounded-md bg-destructive px-3 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Opslaan…" : "Markeer als 'Niet doen'"}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
