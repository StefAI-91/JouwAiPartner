"use client";

import { useState, useTransition } from "react";
import { ArrowUpRight, CalendarDays, Check, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/utils";
import { promoteToTaskAction } from "@/actions/tasks";
import type { PersonForAssignment } from "@repo/database/queries/people";

interface FollowUpItem {
  id: string;
  content: string;
  metadata?: {
    follow_up_contact?: string;
    category?: string;
    assignee?: string;
    deadline?: string;
    suggested_deadline?: string;
  } | null;
}

interface FollowUpChecklistProps {
  items: FollowUpItem[];
  promotedIds?: string[];
  people?: PersonForAssignment[];
  onEdit?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
}

const ACTION_VERBS = [
  "checken",
  "vragen",
  "navragen",
  "opvolgen",
  "controleren",
  "bevestigen",
  "afchecken",
  "informeren",
  "heeft",
  "is",
];

function cleanContent(content: string, contact?: string): string {
  let cleaned = content;

  if (contact) {
    const prefixes = [
      `Opvolgen bij ${contact}:`,
      `Beslissing nodig van ${contact}:`,
      `Opvolgen: ${contact} levert`,
      `${contact}:`,
      `${contact} —`,
      `${contact} -`,
    ];
    for (const prefix of prefixes) {
      if (cleaned.toLowerCase().startsWith(prefix.toLowerCase())) {
        cleaned = cleaned.slice(prefix.length).trim();
        break;
      }
    }
  }

  cleaned = cleaned.replace(/\s*—\s*(nodig voor|blokkeert)\s.+$/i, "");
  cleaned = cleaned.replace(/\s*\([^)]{15,}\)/g, "");
  cleaned = cleaned.trim();
  if (cleaned.length === 0) return content;
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  const firstWord = cleaned
    .split(/\s/)[0]
    .toLowerCase()
    .replace(/[^a-zà-ú]/g, "");
  if (!ACTION_VERBS.some((v) => firstWord === v)) {
    cleaned = "Checken of " + cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  }

  return cleaned;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDeadline(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function ContactAvatar({ name, dimmed = false }: { name?: string; dimmed?: boolean }) {
  if (!name) {
    return (
      <div
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full border border-dashed border-border bg-muted/40 text-muted-foreground",
          dimmed && "opacity-50",
        )}
        aria-hidden
      >
        <Sparkles className="size-3.5" />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground",
        "text-[11px] font-semibold tracking-wide ring-1 ring-border/60",
        dimmed && "opacity-50",
      )}
      aria-hidden
    >
      {getInitials(name)}
    </div>
  );
}

function FollowUpRow({
  item,
  isPromoted: initialPromoted,
  people,
  onEdit,
  onDelete,
}: {
  item: FollowUpItem;
  isPromoted: boolean;
  people: PersonForAssignment[];
  onEdit?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [promoted, setPromoted] = useState(initialPromoted);
  const [showForm, setShowForm] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(
    item.metadata?.deadline ?? item.metadata?.suggested_deadline ?? null,
  );
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.content);

  const contact = item.metadata?.follow_up_contact;
  const category = item.metadata?.category;
  const suggestedDeadline = item.metadata?.deadline ?? item.metadata?.suggested_deadline ?? null;
  const displayContent = cleanContent(item.content, contact);
  const teammates = people.filter((p) => p.team);
  const clients = people.filter((p) => !p.team);

  function handlePromote() {
    startTransition(async () => {
      const result = await promoteToTaskAction({
        extractionId: item.id,
        title: item.content,
        assignedTo,
        dueDate,
      });
      if ("success" in result) {
        setPromoted(true);
        setShowForm(false);
      }
    });
  }

  function handleSaveEdit() {
    setEditing(false);
    if (editContent !== item.content && onEdit) {
      onEdit(item.id, editContent);
    }
  }

  if (promoted) {
    return (
      <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
        <ContactAvatar name={contact} dimmed />
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground">
          <Check className="size-3.5 shrink-0 text-success" strokeWidth={3} />
          <span className="truncate line-through decoration-muted-foreground/40">
            {contact && <span className="font-medium">{contact}: </span>}
            {displayContent}
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
          Taak aangemaakt
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group rounded-xl px-3 py-3 transition-colors",
        "hover:bg-muted/50",
        showForm && "bg-muted/40",
      )}
    >
      <div className="flex items-start gap-3">
        <ContactAvatar name={contact} />

        <div className="min-w-0 flex-1">
          {contact && (
            <div className="text-sm font-medium leading-tight text-foreground">{contact}</div>
          )}

          {editing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                }
              }}
              autoFocus
              className={cn(
                "w-full resize-none rounded-md border border-input bg-background px-2 py-1 text-sm leading-relaxed outline-none",
                "focus:border-ring focus:ring-2 focus:ring-ring/20",
                contact && "mt-1",
              )}
              rows={2}
            />
          ) : (
            <p
              className={cn(
                "cursor-text text-sm leading-relaxed text-muted-foreground",
                contact && "mt-0.5",
                onEdit && "hover:text-foreground/80",
              )}
              onClick={() => onEdit && setEditing(true)}
            >
              {displayContent}
            </p>
          )}

          {(suggestedDeadline || category) && !showForm && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-muted-foreground">
              {suggestedDeadline && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3" />
                  <span>{formatDeadline(suggestedDeadline)}</span>
                </span>
              )}
              {suggestedDeadline && category && (
                <span aria-hidden className="text-border">
                  ·
                </span>
              )}
              {category && <span className="capitalize tracking-wide">{category}</span>}
            </div>
          )}
        </div>

        {!showForm && (
          <div className="flex shrink-0 items-center gap-1">
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className={cn(
                  "rounded-md p-1.5 text-muted-foreground/60 transition-all",
                  "opacity-0 group-hover:opacity-100",
                  "hover:bg-destructive/10 hover:text-destructive",
                  "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30",
                )}
                aria-label="Verwijder suggestie"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setShowForm(true)}
              className={cn(
                "group/btn gap-1.5",
                "hover:border-primary hover:bg-primary hover:text-primary-foreground",
              )}
            >
              <span>Maak taak</span>
              <ArrowUpRight
                className="size-3 transition-transform duration-200 group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5"
                strokeWidth={2.5}
              />
            </Button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="mt-3 ml-12 rounded-lg border border-border/60 bg-card p-2.5 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={assignedTo ?? ""}
              onChange={(e) => setAssignedTo(e.target.value || null)}
              className={cn(
                "h-7 rounded-md border border-border bg-background px-2 text-xs outline-none",
                "focus:border-ring focus:ring-2 focus:ring-ring/20",
              )}
            >
              <option value="">Toewijzen aan…</option>
              {teammates.length > 0 && (
                <optgroup label="Team">
                  {teammates.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {clients.length > 0 && (
                <optgroup label="Klant">
                  {clients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <input
              type="date"
              value={dueDate ?? ""}
              onChange={(e) => setDueDate(e.target.value || null)}
              className={cn(
                "h-7 rounded-md border border-border bg-background px-2 text-xs outline-none",
                "focus:border-ring focus:ring-2 focus:ring-ring/20",
              )}
            />
            <div className="ml-auto flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setShowForm(false)}
                disabled={isPending}
              >
                <X className="size-3" />
                Annuleer
              </Button>
              <Button type="button" size="xs" onClick={handlePromote} disabled={isPending}>
                <Check className="size-3" strokeWidth={3} />
                {isPending ? "Bezig…" : "Bevestigen"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FollowUpChecklist({
  items,
  promotedIds,
  people,
  onEdit,
  onDelete,
}: FollowUpChecklistProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <div className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
          <Sparkles className="size-4" />
        </div>
        <p className="text-sm text-muted-foreground">Geen opvolgsuggesties voor deze meeting</p>
      </div>
    );
  }

  return (
    <div className="-mx-3 space-y-0.5">
      {items.map((item) => (
        <FollowUpRow
          key={item.id}
          item={item}
          isPromoted={promotedIds?.includes(item.id) ?? false}
          people={people ?? []}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
