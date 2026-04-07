"use client";

import { useState, useTransition } from "react";
import { Check, CheckCircle2, UserCircle, Calendar, X } from "lucide-react";
import { promoteToTaskAction } from "@/actions/tasks";
import type { PersonForAssignment } from "@repo/database/queries/people";

interface PromoteTaskFormProps {
  extractionId: string;
  title: string;
  people: PersonForAssignment[];
  defaultDueDate?: string | null;
  defaultAssignee?: string | null;
  onPromoted: () => void;
  onCancel: () => void;
}

export function PromoteTaskForm({
  extractionId,
  title,
  people,
  defaultDueDate,
  defaultAssignee,
  onPromoted,
  onCancel,
}: PromoteTaskFormProps) {
  const [assignedTo, setAssignedTo] = useState<string | null>(defaultAssignee ?? null);
  const [dueDate, setDueDate] = useState<string | null>(defaultDueDate ?? null);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const teammates = people.filter((p) => p.team);
  const clients = people.filter((p) => !p.team);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await promoteToTaskAction({
        extractionId,
        title,
        assignedTo,
        dueDate,
        alreadyDone: alreadyDone || undefined,
      });
      if ("success" in result) {
        onPromoted();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="mt-3 rounded-lg border border-green-200 bg-green-50/50 p-3">
      <p className="mb-2 text-[11px] font-medium text-green-800">Taak aanmaken</p>
      <div className="flex flex-wrap items-end gap-2">
        {/* Person selector */}
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <UserCircle className="size-3" />
            Toewijzen aan
          </label>
          <select
            value={assignedTo ?? ""}
            onChange={(e) => setAssignedTo(e.target.value || null)}
            className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Niemand</option>
            {teammates.length > 0 && (
              <optgroup label="Team">
                {teammates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.team}
                  </option>
                ))}
              </optgroup>
            )}
            {clients.length > 0 && (
              <optgroup label="Klant">
                {clients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.organization_name ? ` — ${p.organization_name}` : ""}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Due date */}
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <Calendar className="size-3" />
            Deadline
            <span className="font-normal text-muted-foreground/70">(optioneel)</span>
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dueDate ?? ""}
              onChange={(e) => setDueDate(e.target.value || null)}
              className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
            />
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate(null)}
                className="flex h-7 items-center rounded-md px-1.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                title="Verwijder deadline"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Already done toggle */}
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <CheckCircle2 className="size-3" />
            Status
          </label>
          <label className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-2 text-xs select-none">
            <input
              type="checkbox"
              checked={alreadyDone}
              onChange={(e) => setAlreadyDone(e.target.checked)}
              className="accent-green-600"
            />
            Al afgerond
          </label>
        </div>

        {/* Actions */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="flex h-7 items-center gap-1 rounded-md bg-green-600 px-2.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          <Check className="size-3" />
          {isPending ? "Bezig..." : "Aanmaken"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-7 items-center rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Annuleren
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
