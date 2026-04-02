"use client";

import { useState, useRef, useEffect, useTransition, type ReactNode } from "react";
import { Pencil, Check, X, Building2, FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  updateMeetingTitleAction,
  updateMeetingTypeAction,
  updateMeetingOrganizationAction,
  linkMeetingProjectAction,
  unlinkMeetingProjectAction,
  createOrganizationAction,
  createProjectAction,
} from "@/actions/meetings";

// ── Types ──

interface Organization {
  id: string;
  name: string;
  type: string;
}

interface Project {
  id: string;
  name: string;
}

// ── Constants ──

const MEETING_TYPES = [
  { value: "strategy", label: "Strategy" },
  { value: "one_on_one", label: "One on one" },
  { value: "team_sync", label: "Team sync" },
  { value: "discovery", label: "Discovery" },
  { value: "sales", label: "Sales" },
  { value: "project_kickoff", label: "Project kickoff" },
  { value: "status_update", label: "Status update" },
  { value: "collaboration", label: "Collaboration" },
  { value: "other", label: "Overig" },
] as const;

const ORG_TYPES = [
  { value: "client", label: "Klant" },
  { value: "partner", label: "Partner" },
  { value: "supplier", label: "Leverancier" },
  { value: "other", label: "Overig" },
] as const;

const ORG_TYPE_LABELS: Record<string, string> = {
  client: "klant",
  partner: "partner",
  supplier: "leverancier",
  other: "overig",
};

// ── Modal ──

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-full max-w-md rounded-xl border border-border bg-background p-0 shadow-lg backdrop:bg-black/50"
    >
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Sluiten">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
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

// ── Meeting Type Selector ──

export function MeetingTypeSelector({
  meetingId,
  currentType,
}: {
  meetingId: string;
  currentType: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentLabel = MEETING_TYPES.find((t) => t.value === currentType)?.label
    ?? currentType?.replace(/_/g, " ")
    ?? "Onbekend";

  function handleChange(value: string) {
    if (value === currentType) {
      setEditing(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateMeetingTypeAction({
        meetingId,
        meetingType: value as typeof MEETING_TYPES[number]["value"],
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
      <button
        onClick={() => setEditing(true)}
        className="inline-flex cursor-pointer items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium transition-colors hover:bg-muted/80"
        aria-label="Meeting type wijzigen"
      >
        {currentLabel}
        <Pencil className="ml-1 size-2.5 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <select
        value={currentType ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className="h-6 rounded-md border border-border bg-background px-1.5 text-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
      >
        {MEETING_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          setError(null);
          setEditing(false);
        }}
        disabled={isPending}
        className="rounded p-0.5 hover:bg-muted"
        aria-label="Annuleren"
      >
        <X className="size-3 text-muted-foreground" />
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

// ── Organization Selector (with + create modal) ──

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
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(orgId: string) {
    if (orgId === "__new__") {
      setShowCreate(true);
      return;
    }

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

  function handleCreated(newOrg: { id: string; name: string }) {
    setShowCreate(false);
    // After creating, immediately link it
    setError(null);
    startTransition(async () => {
      const result = await updateMeetingOrganizationAction({
        meetingId,
        organizationId: newOrg.id,
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
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Organisatie
        </span>
        <span className="text-sm">
          {currentOrgName ?? <span className="text-muted-foreground">Niet gekoppeld</span>}
        </span>
        <button
          onClick={() => setEditing(true)}
          className="rounded p-0.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
          aria-label="Organisatie wijzigen"
        >
          <Pencil className="size-3 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Building2 className="size-3.5 text-muted-foreground" />
          <select
            value={currentOrgId ?? ""}
            onChange={(e) => handleChange(e.target.value)}
            disabled={isPending}
            className="h-7 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          >
            <option value="">Geen organisatie</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({ORG_TYPE_LABELS[org.type] ?? org.type})
              </option>
            ))}
            <option value="__new__">+ Nieuwe organisatie aanmaken</option>
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

      <CreateOrganizationModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    </>
  );
}

// ── Create Organization Modal ──

function CreateOrganizationModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (org: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("client");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setType("client");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Naam is verplicht");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createOrganizationAction({
        name: trimmed,
        type: type as "client" | "partner" | "supplier" | "other",
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        onCreated(result.data);
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Nieuwe organisatie aanmaken">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="org-name" className="mb-1 block text-sm font-medium">
            Naam
          </label>
          <input
            ref={inputRef}
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            placeholder="Bijv. Acme B.V."
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div>
          <label htmlFor="org-type" className="mb-1 block text-sm font-medium">
            Type
          </label>
          <select
            id="org-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={isPending}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          >
            {ORG_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Annuleren
          </Button>
          <Button type="submit" disabled={isPending}>
            Aanmaken
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Project Linker (with + create modal) ──

export function ProjectLinker({
  meetingId,
  linkedProjects,
  allProjects,
  organizations,
}: {
  meetingId: string;
  linkedProjects: { id: string; name: string }[];
  allProjects: Project[];
  organizations: Organization[];
}) {
  const [adding, setAdding] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const linkedIds = new Set(linkedProjects.map((p) => p.id));
  const availableProjects = allProjects.filter((p) => !linkedIds.has(p.id));

  function handleAdd(projectId: string) {
    if (projectId === "__new__") {
      setShowCreate(true);
      return;
    }
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

  function handleCreated(newProject: { id: string; name: string }) {
    setShowCreate(false);
    // After creating, immediately link it
    setError(null);
    startTransition(async () => {
      const result = await linkMeetingProjectAction({ meetingId, projectId: newProject.id });
      if ("error" in result) {
        setError(result.error);
      } else {
        setAdding(false);
      }
    });
  }

  return (
    <>
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
              <option value="__new__">+ Nieuw project aanmaken</option>
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
            className="text-muted-foreground"
          >
            <Plus className="size-3" data-icon="inline-start" />
            Project koppelen
          </Button>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
        organizations={organizations}
      />
    </>
  );
}

// ── Create Project Modal ──

function CreateProjectModal({
  open,
  onClose,
  onCreated,
  organizations,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (project: { id: string; name: string }) => void;
  organizations: Organization[];
}) {
  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setOrganizationId("");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Naam is verplicht");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createProjectAction({
        name: trimmed,
        organizationId: organizationId || null,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        onCreated(result.data);
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Nieuw project aanmaken">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="project-name" className="mb-1 block text-sm font-medium">
            Naam
          </label>
          <input
            ref={inputRef}
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            placeholder="Bijv. Website Redesign"
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div>
          <label htmlFor="project-org" className="mb-1 block text-sm font-medium">
            Klant (optioneel)
          </label>
          <select
            id="project-org"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            disabled={isPending}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          >
            <option value="">Geen klant</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Annuleren
          </Button>
          <Button type="submit" disabled={isPending}>
            Aanmaken
          </Button>
        </div>
      </form>
    </Modal>
  );
}
