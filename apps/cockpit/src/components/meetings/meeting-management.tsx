"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Pencil, Check, X, Building2, FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  updateMeetingTitleAction,
  updateMeetingOrganizationAction,
  linkMeetingProjectAction,
  unlinkMeetingProjectAction,
} from "@/actions/meetings";

// ── Types ──

interface Organization {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

// ── Editable Title ──

export function EditableTitle({
  meetingId,
  initialTitle,
}: {
  meetingId: string;
  initialTitle: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Titel is verplicht");
      return;
    }
    if (trimmed === (initialTitle ?? "")) {
      setEditing(false);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await updateMeetingTitleAction({ meetingId, title: trimmed });
      if ("error" in result) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  function handleCancel() {
    setTitle(initialTitle ?? "");
    setError(null);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="group flex items-center gap-2">
        <h1 className="text-xl font-semibold">{initialTitle ?? "Naamloze meeting"}</h1>
        <button
          onClick={() => setEditing(true)}
          className="rounded p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
          aria-label="Titel bewerken"
        >
          <Pencil className="size-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          disabled={isPending}
          className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-xl font-semibold outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
        />
        <Button size="icon-sm" onClick={handleSave} disabled={isPending} aria-label="Opslaan">
          <Check className="size-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={isPending}
          aria-label="Annuleren"
        >
          <X className="size-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Organization Selector ──

export function OrganizationSelector({
  meetingId,
  currentOrgId,
  currentOrgName,
  organizations,
}: {
  meetingId: string;
  currentOrgId: string | null;
  currentOrgName: string | null;
  organizations: Organization[];
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(orgId: string) {
    setError(null);
    const newOrgId = orgId === "" ? null : orgId;

    startTransition(async () => {
      const result = await updateMeetingOrganizationAction({
        meetingId,
        organizationId: newOrgId,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  if (!editing) {
    return (
      <div className="group flex items-center gap-1.5">
        <Building2 className="size-3.5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {currentOrgName ?? "Geen klant gekoppeld"}
        </span>
        <button
          onClick={() => setEditing(true)}
          className="rounded p-0.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
          aria-label="Klant wijzigen"
        >
          <Pencil className="size-3 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Building2 className="size-3.5 text-muted-foreground" />
        <select
          value={currentOrgId ?? ""}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isPending}
          className="h-7 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
        >
          <option value="">Geen klant</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => {
            setError(null);
            setEditing(false);
          }}
          disabled={isPending}
          aria-label="Annuleren"
        >
          <X className="size-3.5" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Project Linker ──

export function ProjectLinker({
  meetingId,
  linkedProjects,
  allProjects,
}: {
  meetingId: string;
  linkedProjects: { id: string; name: string }[];
  allProjects: Project[];
}) {
  const [adding, setAdding] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const linkedIds = new Set(linkedProjects.map((p) => p.id));
  const availableProjects = allProjects.filter((p) => !linkedIds.has(p.id));

  function handleAdd(projectId: string) {
    if (!projectId) return;
    setError(null);

    startTransition(async () => {
      const result = await linkMeetingProjectAction({ meetingId, projectId });
      if ("error" in result) {
        setError(result.error);
      } else {
        setAdding(false);
      }
    });
  }

  function handleRemove(projectId: string) {
    setError(null);
    startTransition(async () => {
      const result = await unlinkMeetingProjectAction({ meetingId, projectId });
      if ("error" in result) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <FolderKanban className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Projecten
        </span>
      </div>

      {linkedProjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {linkedProjects.map((project) => (
            <span
              key={project.id}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
            >
              {project.name}
              <button
                onClick={() => handleRemove(project.id)}
                disabled={isPending}
                className="rounded-full p-0.5 hover:bg-background/80"
                aria-label={`${project.name} ontkoppelen`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {linkedProjects.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground">Geen projecten gekoppeld</p>
      )}

      {adding ? (
        <div className="flex items-center gap-2">
          <select
            onChange={(e) => handleAdd(e.target.value)}
            disabled={isPending}
            defaultValue=""
            className="h-7 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          >
            <option value="" disabled>
              Kies een project...
            </option>
            {availableProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              setError(null);
              setAdding(false);
            }}
            disabled={isPending}
            aria-label="Annuleren"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <Button
          size="xs"
          variant="ghost"
          onClick={() => setAdding(true)}
          disabled={availableProjects.length === 0}
          className="text-muted-foreground"
        >
          <Plus className="size-3" data-icon="inline-start" />
          Project koppelen
        </Button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
