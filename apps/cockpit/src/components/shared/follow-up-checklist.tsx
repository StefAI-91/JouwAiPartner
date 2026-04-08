"use client";

import { useState, useTransition } from "react";
import { Check, X, Trash2, UserCircle, Calendar } from "lucide-react";
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

/**
 * Strip redundant prefixes, long tails, and parenthetical details from content.
 * Handles both old verbose format and new short format.
 */
function cleanContent(content: string, contact?: string): string {
  let cleaned = content;

  // Step 1: Strip contact-name prefixes
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

  // Step 2: Strip "— nodig voor ..." / "— blokkeert ..." tails
  cleaned = cleaned.replace(/\s*—\s*(nodig voor|blokkeert)\s.+$/i, "");

  // Step 3: Strip parenthetical details like "(Windows 11 licentie, ...)"
  cleaned = cleaned.replace(/\s*\([^)]{15,}\)/g, "");

  // Step 4: Capitalize first letter
  cleaned = cleaned.trim();
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
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
      <div className="flex items-center gap-2 py-1.5 text-sm text-muted-foreground">
        <Check className="size-3.5 text-green-500" />
        <span className="line-through">
          {contact && <span className="font-medium">{contact}:</span>} {displayContent}
        </span>
      </div>
    );
  }

  return (
    <div className="group">
      <div className="flex items-start gap-2 py-1.5">
        <div className="mt-0.5 size-1.5 shrink-0 rounded-full bg-amber-400" />
        <div className="flex-1 min-w-0">
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
              className="w-full resize-none rounded border border-input bg-muted/30 px-2 py-0.5 text-sm outline-none focus:border-primary"
              rows={1}
            />
          ) : (
            <p
              className="cursor-text text-sm leading-snug"
              onClick={() => onEdit && setEditing(true)}
            >
              {contact && <span className="font-semibold text-foreground">{contact}</span>}
              {contact && <span className="text-muted-foreground"> — </span>}
              <span className="text-muted-foreground">{displayContent}</span>
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded px-2 py-0.5 text-[11px] font-medium text-green-700 transition-colors hover:bg-green-50"
            >
              Maak taak
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
            >
              <Trash2 className="size-3" />
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="ml-3.5 flex flex-wrap items-center gap-2 pb-2 pl-1">
          <select
            value={assignedTo ?? ""}
            onChange={(e) => setAssignedTo(e.target.value || null)}
            className="h-6 rounded border border-input bg-background px-1.5 text-[11px] outline-none"
          >
            <option value="">Toewijzen...</option>
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
            className="h-6 rounded border border-input bg-background px-1.5 text-[11px] outline-none"
          />
          <button
            type="button"
            onClick={handlePromote}
            disabled={isPending}
            className="flex h-6 items-center gap-1 rounded bg-green-600 px-2 text-[11px] font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Check className="size-3" />
            {isPending ? "..." : "OK"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="flex h-6 items-center rounded px-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
          </button>
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
    return <p className="py-6 text-center text-sm text-muted-foreground">Geen opvolgsuggesties</p>;
  }

  return (
    <div className="divide-y divide-border/30">
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
