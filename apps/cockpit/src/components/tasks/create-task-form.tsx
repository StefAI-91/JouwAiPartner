"use client";

import { useState, useTransition } from "react";
import { createTaskAction } from "@/actions/tasks";
import { Plus, X, Check } from "lucide-react";
import type { PersonForAssignment } from "@repo/database/queries/people";

export function CreateTaskForm({
  teammates,
  clients,
}: {
  teammates: PersonForAssignment[];
  clients: PersonForAssignment[];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setAssignedTo(null);
    setDueDate(null);
    setError(null);
    setOpen(false);
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createTaskAction({
        title: title.trim(),
        assignedTo,
        dueDate,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        reset();
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-border px-3 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="size-3.5" />
        Nieuwe taak
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="flex flex-col gap-2.5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Wat moet er gebeuren?"
          autoFocus
          className="h-8 rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim()) handleSubmit();
            if (e.key === "Escape") reset();
          }}
        />

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-muted-foreground">Toewijzen aan</label>
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

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-muted-foreground">Deadline</label>
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
                  className="flex h-7 items-center rounded-md px-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !title.trim()}
            className="flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-xs text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Check className="size-3" />
            {isPending ? "Aanmaken..." : "Aanmaken"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="flex h-7 items-center rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Annuleren
          </button>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
