"use client";

import { useState, useTransition } from "react";
import { FolderKanban, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { linkEmailProjectAction, unlinkEmailProjectAction } from "@/actions/email-links";

export function ProjectLinker({
  emailId,
  linkedProjects,
  allProjects,
}: {
  emailId: string;
  linkedProjects: { id: string; name: string }[];
  allProjects: { id: string; name: string }[];
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
      const result = await linkEmailProjectAction({ emailId, projectId });
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
      const result = await unlinkEmailProjectAction({ emailId, projectId });
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
