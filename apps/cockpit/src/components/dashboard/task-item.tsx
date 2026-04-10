"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDateShort } from "@repo/ui/format";
import { updateTaskAction, completeTaskAction, dismissTaskAction } from "@/actions/tasks";
import { Check, X, ChevronDown, CircleCheck, ExternalLink } from "lucide-react";
import { getUrgency } from "@/lib/urgency";
import type { TaskRow } from "@repo/database/queries/tasks";
import type { PersonForAssignment } from "@repo/database/queries/people";

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
  const isCompleted = task.status === "done";
  const meetingId = task.extraction?.meeting_id ?? null;
  const projectName = task.extraction?.project?.name ?? null;

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

  const borderColor = isCompleted
    ? "border-green-400"
    : urgency === "overdue"
      ? "border-red-500"
      : urgency === "this-week"
        ? "border-amber-400"
        : "border-transparent";

  const hoverBg = isCompleted
    ? ""
    : urgency === "overdue"
      ? "hover:bg-red-50/50"
      : urgency === "this-week"
        ? "hover:bg-amber-50/50"
        : "hover:bg-muted/30";

  const dateColor =
    urgency === "overdue"
      ? "text-red-600"
      : urgency === "this-week"
        ? "text-amber-600"
        : "text-muted-foreground";

  const dateLabel = task.due_date
    ? `${urgency === "overdue" ? "verlopen · " : ""}${formatDateShort(task.due_date)}`
    : null;

  return (
    <div className="group">
      <div
        className={`flex items-start gap-2.5 rounded-r-lg border-l-[3px] py-2 pl-3 pr-1 transition-colors ${borderColor} ${hoverBg} ${isCompleted ? "opacity-60" : ""}`}
      >
        {/* Checkbox / done icon */}
        {isCompleted ? (
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500">
            <Check className="size-3 text-white" strokeWidth={3} />
          </div>
        ) : (
          <button
            type="button"
            onClick={handleComplete}
            disabled={isPending}
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30 transition-colors hover:border-green-500 hover:bg-green-50 disabled:opacity-50"
            title="Markeer als klaar"
          />
        )}

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm leading-snug ${isCompleted ? "text-muted-foreground line-through" : ""}`}
          >
            {task.title}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {projectName && (
              <span className="text-[11px] font-medium text-muted-foreground">{projectName}</span>
            )}
            {projectName && dateLabel && (
              <span className="text-[11px] text-muted-foreground/40">·</span>
            )}
            {dateLabel && (
              <span className={`text-[11px] font-medium ${dateColor}`}>{dateLabel}</span>
            )}
            {meetingId && (
              <Link
                href={`/meetings/${meetingId}`}
                className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <ExternalLink className="size-2.5" />
                meeting
              </Link>
            )}
          </div>
        </div>

        {/* Edit toggle */}
        {!editing && !isCompleted && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-1 shrink-0 rounded-md p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
            title="Bewerken"
          >
            <ChevronDown className="size-3.5" />
          </button>
        )}
      </div>

      {/* Edit form */}
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
            <label className="text-[10px] font-medium text-muted-foreground">
              Deadline <span className="font-normal text-muted-foreground/70">(optioneel)</span>
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
                  className="flex h-7 items-center rounded-md px-1.5 text-muted-foreground transition-colors hover:text-foreground"
                  title="Verwijder deadline"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
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
            title="Verwijder opvolgpunt"
          >
            <X className="size-3" />
            Verwijder
          </button>
        </div>
      )}

      {error && <p className="ml-6 mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
