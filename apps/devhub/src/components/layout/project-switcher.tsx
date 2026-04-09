"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, FolderKanban } from "lucide-react";
import { cn } from "@repo/ui/utils";
import { PROJECT_CHANGE_EVENT } from "@/hooks/use-project";

interface Project {
  id: string;
  name: string;
}

const STORAGE_KEY = "devhub-selected-project";

function getInitialProject(projects: Project[]): string | null {
  if (typeof window === "undefined") return projects[0]?.id ?? null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && projects.find((p) => p.id === stored)) return stored;
  if (projects.length > 0) {
    localStorage.setItem(STORAGE_KEY, projects[0].id);
    return projects[0].id;
  }
  return null;
}

export function ProjectSwitcher({
  projects,
  onProjectChange,
}: {
  projects: Project[];
  onProjectChange?: (projectId: string | null) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(() => getInitialProject(projects));
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      localStorage.setItem(STORAGE_KEY, id);
      window.dispatchEvent(new Event(PROJECT_CHANGE_EVENT));
      setOpen(false);
      onProjectChange?.(id);
    },
    [onProjectChange],
  );

  // Sync onProjectChange on mount
  useEffect(() => {
    onProjectChange?.(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = projects.find((p) => p.id === selectedId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
      >
        <FolderKanban className="size-4 text-muted-foreground" />
        <span>{selected?.name ?? "Selecteer project..."}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-popover py-1 shadow-lg">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSelect(project.id)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-accent",
                  project.id === selectedId && "bg-accent font-medium",
                )}
              >
                <FolderKanban className="size-3.5 text-muted-foreground" />
                {project.name}
              </button>
            ))}
            {projects.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">Geen projecten gevonden</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export { STORAGE_KEY };
