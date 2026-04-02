"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateShort } from "@/lib/format";
import { updateActionItemAssignmentAction } from "@/actions/action-items";
import { UserCircle, Calendar, ChevronDown, Check } from "lucide-react";
import type { ActionItemRow } from "@repo/database/queries/action-items";

interface PersonOption {
  id: string;
  name: string;
  team: string | null;
  organization_name: string | null;
}

interface ActionItemsCardProps {
  items: ActionItemRow[];
  people: PersonOption[];
}

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

export function ActionItemsCard({ items, people }: ActionItemsCardProps) {
  const teammates = people.filter((p) => p.team);
  const clients = people.filter((p) => !p.team);

  return (
    <Card>
      <CardHeader className="border-b border-border/50">
        <CardTitle>Open actiepunten</CardTitle>
        <CardDescription>Geverifieerde taken uit meetings</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Geen openstaande actiepunten.
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
            {items.map((item) => (
              <ActionItemRow
                key={item.id}
                item={item}
                teammates={teammates}
                clients={clients}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ActionItemRow({
  item,
  teammates,
  clients,
}: {
  item: ActionItemRow;
  teammates: PersonOption[];
  clients: PersonOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [assignedTo, setAssignedTo] = useState(item.assigned_to);
  const [dueDate, setDueDate] = useState(item.due_date);
  const [isPending, startTransition] = useTransition();

  const effectiveDueDate = dueDate ?? (item.metadata as Record<string, string>)?.deadline ?? null;
  const urgency = getUrgency(effectiveDueDate);

  const assignedPerson = item.assigned_person;
  const metadataAssignee = (item.metadata as Record<string, string>)?.assignee ?? null;

  function handleSave() {
    startTransition(async () => {
      await updateActionItemAssignmentAction({
        extractionId: item.id,
        assignedTo: assignedTo,
        dueDate: dueDate,
      });
      setEditing(false);
    });
  }

  return (
    <li className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
      <p className="text-sm leading-snug">{item.content}</p>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {/* Assignee display */}
        {assignedPerson ? (
          <Badge variant="outline" className="h-5 gap-1 text-[10px]">
            <UserCircle className="size-3" />
            {assignedPerson.name}
            {assignedPerson.team ? (
              <span className="text-muted-foreground">({assignedPerson.team})</span>
            ) : (
              <span className="text-muted-foreground">(klant)</span>
            )}
          </Badge>
        ) : metadataAssignee ? (
          <Badge variant="outline" className="h-5 gap-1 text-[10px] opacity-60">
            <UserCircle className="size-3" />
            {metadataAssignee}
          </Badge>
        ) : null}

        {/* Due date display */}
        {effectiveDueDate && (
          <Badge
            variant={URGENCY_BADGE_VARIANTS[urgency]}
            className="h-5 gap-1 text-[10px]"
          >
            <Calendar className="size-3" />
            {urgency === "overdue" ? "Verlopen · " : ""}
            {formatDateShort(effectiveDueDate)}
          </Badge>
        )}

        {/* Project badge */}
        {item.project && (
          <Badge variant="outline" className="h-5 text-[10px]">
            {item.project.name}
          </Badge>
        )}

        {/* Edit toggle */}
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ml-auto rounded-md p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 [li:hover_&]:opacity-100"
            title="Toewijzen"
          >
            <ChevronDown className="size-3.5" />
          </button>
        )}
      </div>

      {/* Inline edit panel */}
      {editing && (
        <div className="mt-1 flex flex-wrap items-end gap-2 rounded-lg bg-muted/50 p-2">
          {/* Person selector */}
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

          {/* Due date picker */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-muted-foreground">Deadline</label>
            <input
              type="date"
              value={dueDate ?? ""}
              onChange={(e) => setDueDate(e.target.value || null)}
              className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Save / Cancel */}
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
              setAssignedTo(item.assigned_to);
              setDueDate(item.due_date);
              setEditing(false);
            }}
            className="flex h-7 items-center rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Annuleren
          </button>
        </div>
      )}
    </li>
  );
}
