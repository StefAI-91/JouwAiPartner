"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDateShort } from "@/lib/format";
import {
  updateTaskAction,
  completeTaskAction,
  dismissTaskAction,
} from "@/actions/tasks";
import { UserCircle, Calendar, ChevronDown, Check, X, CircleCheck } from "lucide-react";
import type { TaskRow } from "@repo/database/queries/tasks";
import type { PersonForAssignment } from "@repo/database/queries/people";

type Urgency = "overdue" | "this-week" | "default";

function getUrgency(dueDateStr: string | null): Urgency {
  if (!dueDateStr) return "default";
  const due = new Date(dueDateStr);
  const now = new Date();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = (dueMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "this-week";
  return "default";
}

const URGENCY_BADGE_VARIANTS: Record<Urgency, "destructive" | "secondary" | "outline"> = {
  overdue: "destructive",
  "this-week": "secondary",
  default: "outline",
};

export function TaskItem({
  task,
  teammates,
  clients,
}: {
  task: TaskRow;
  teammates: PersonForAssignment[];
  clients: PersonForAssignment[];
}) {
  const [editing, setEditing] = useState(false);
  const [assignedTo, setAssignedTo] = useState(task.assigned_to);
  const [dueDate, setDueDate] = useState(task.due_date);
  const [isPending, startTransition] = useTransition();
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urgency = getUrgency(task.due_date);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateTaskAction({
        taskId: task.id,
        assignedTo: assignedTo,
        dueDate: dueDate,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  function handleComplete() {
    setError(null);
    startTransition(async () => {
      const result = await completeTaskAction({ taskId: task.id });
      if ("error" in result) {
        setError(result.error);
      } else {
        setIsDone(true);
      }
    });
  }

  function handleDismiss() {
    setError(null);
    startTransition(async () => {
      const result = await dismissTaskAction({ taskId: task.id });
      if ("error" in result) {
        setError(result.error);
      } else {
        setIsDone(true);
      }
    });
  }

  if (isDone) return null;

  return (
    <li className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={handleComplete}
          disabled={isPending}
          className="mt-0.5 shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-green-50 hover:text-green-600 disabled:opacity-50"
          title="Markeer als klaar"
        >
          <CircleCheck className="size-4" />
        </button>
        <div className="flex-1">
          <p className="text-sm leading-snug">{task.title}</p>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {task.assigned_person ? (
              <Badge variant="outline" className="h-5 gap-1 text-[10px]">
                <UserCircle className="size-3" />
                {task.assigned_person.name}
                {task.assigned_person.team ? (
                  <span className="text-muted-foreground">({task.assigned_person.team})</span>
                ) : (
                  <span className="text-muted-foreground">(klant)</span>
                )}
              </Badge>
            ) : null}

            {task.due_date && (
              <Badge variant={URGENCY_BADGE_VARIANTS[urgency]} className="h-5 gap-1 text-[10px]">
                <Calendar className="size-3" />
                {urgency === "overdue" ? "Verlopen · " : ""}
                {formatDateShort(task.due_date)}
              </Badge>
            )}

            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="ml-auto rounded-md p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground [li:hover_&]:opacity-100"
                title="Bewerken"
              >
                <ChevronDown className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <div className="ml-6 mt-1 flex flex-wrap items-end gap-2 rounded-lg bg-muted/50 p-2">
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
            <input
              type="date"
              value={dueDate ?? ""}
              onChange={(e) => setDueDate(e.target.value || null)}
              className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-xs text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Check className="size-3" />
            {isPending ? "Opslaan..." : "Opslaan"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAssignedTo(task.assigned_to);
              setDueDate(task.due_date);
              setEditing(false);
            }}
            className="flex h-7 items-center rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isPending}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
            title="Verwijder taak"
          >
            <X className="size-3" />
            Verwijder
          </button>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </li>
  );
}
