"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Loader2, Trash2 } from "lucide-react";
import type { SprintRow, SprintStatus } from "@repo/database/queries/sprints";
import { SPRINT_STATUSES } from "@repo/database/queries/sprints";
import { deleteSprintAction, reorderSprintAction, updateSprintAction } from "../actions/sprints";

interface SprintRowEditorProps {
  sprint: SprintRow;
  isFirst: boolean;
  isLast: boolean;
}

const STATUS_LABELS: Record<SprintStatus, string> = {
  planned: "Gepland",
  in_progress: "Loopt",
  delivered: "Opgeleverd",
};

const STATUS_BADGE_CLASSES: Record<SprintStatus, string> = {
  planned: "bg-gray-100 text-gray-700",
  in_progress: "bg-amber-100 text-amber-800",
  delivered: "bg-emerald-100 text-emerald-800",
};

const INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20";

export function SprintRowEditor({ sprint, isFirst, isLast }: SprintRowEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(sprint.name);
  const [deliveryWeek, setDeliveryWeek] = useState(sprint.delivery_week);
  const [summary, setSummary] = useState(sprint.summary ?? "");
  const [testInstructions, setTestInstructions] = useState(sprint.client_test_instructions ?? "");
  const [status, setStatus] = useState<SprintStatus>(sprint.status);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty =
    name.trim() !== sprint.name ||
    deliveryWeek !== sprint.delivery_week ||
    (summary.trim() || "") !== (sprint.summary ?? "") ||
    (testInstructions.trim() || "") !== (sprint.client_test_instructions ?? "") ||
    status !== sprint.status;

  const save = () => {
    startTransition(async () => {
      setError(null);
      const result = await updateSprintAction(sprint.id, {
        name: name.trim(),
        delivery_week: deliveryWeek,
        summary: summary.trim() || null,
        client_test_instructions: testInstructions.trim() || null,
        status,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const remove = () => {
    if (!confirm(`Sprint "${sprint.name}" verwijderen?`)) return;
    startTransition(async () => {
      const result = await deleteSprintAction({
        id: sprint.id,
        project_id: sprint.project_id,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const move = (direction: "up" | "down") => {
    startTransition(async () => {
      const result = await reorderSprintAction({
        id: sprint.id,
        direction,
        project_id: sprint.project_id,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="px-6 py-4">
      <div className="grid grid-cols-12 gap-3 items-start">
        <div className="col-span-3">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Naam
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className={INPUT_CLASS}
          />
        </div>
        <div className="col-span-3">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Opleverweek (maandag)
          </label>
          <input
            type="date"
            value={deliveryWeek}
            onChange={(e) => setDeliveryWeek(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div className="col-span-4">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Samenvatting (klant ziet dit)
          </label>
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={500}
            placeholder="Bijv. Login + onboarding"
            className={INPUT_CLASS}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SprintStatus)}
            className={INPUT_CLASS}
          >
            {SPRINT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          Test-instructies voor klant
          <span className="ml-2 normal-case tracking-normal italic text-muted-foreground/70">
            (zonder dit blijft de sprint onzichtbaar in &ldquo;Klaar om te testen&rdquo;)
          </span>
        </label>
        <textarea
          rows={3}
          value={testInstructions}
          onChange={(e) => setTestInstructions(e.target.value)}
          maxLength={5000}
          placeholder={"Hoe te testen:\n1. Open de preview\n2. ...\n3. Verwacht: ..."}
          className={`${INPUT_CLASS} font-mono`}
        />
      </div>

      {error ? (
        <p className="mt-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGE_CLASSES[sprint.status]}`}
          >
            {STATUS_LABELS[sprint.status]}
          </span>
          <button
            type="button"
            onClick={() => move("up")}
            disabled={isFirst || isPending}
            className="rounded p-1 text-muted-foreground hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Eén plek omhoog"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => move("down")}
            disabled={isLast || isPending}
            className="rounded p-1 text-muted-foreground hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Eén plek omlaag"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/5 disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
            Verwijder
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || isPending}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <Check className="h-3 w-3" aria-hidden />
            )}
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}
