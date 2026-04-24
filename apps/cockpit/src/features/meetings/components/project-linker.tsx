"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { FolderKanban, X, Plus } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Modal } from "@/components/shared/modal";
import { linkMeetingProjectAction, unlinkMeetingProjectAction } from "../actions";
import { createProjectAction } from "@/features/projects/actions/projects";

interface Organization {
  id: string;
  name: string;
}

export function ProjectLinker({
  meetingId,
  linkedProjects,
  allProjects,
  organizations,
}: {
  meetingId: string;
  linkedProjects: { id: string; name: string }[];
  allProjects: { id: string; name: string }[];
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
  return (
    <Modal open={open} onClose={onClose} title="Nieuw project aanmaken">
      {open && (
        <CreateProjectForm onClose={onClose} onCreated={onCreated} organizations={organizations} />
      )}
    </Modal>
  );
}

function CreateProjectForm({
  onClose,
  onCreated,
  organizations,
}: {
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
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

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
          Organisatie (optioneel)
        </label>
        <select
          id="project-org"
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
          disabled={isPending}
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
        >
          <option value="">Geen organisatie</option>
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
  );
}
