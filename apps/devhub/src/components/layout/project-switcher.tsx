"use client";

import { useEffect, useState } from "react";
import { createClient } from "@repo/database/supabase/client";
import { ChevronDown, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECT_CHANGE_EVENT } from "@/hooks/use-project";

interface Project {
  id: string;
  name: string;
}

const STORAGE_KEY = "devhub-selected-project";

export function ProjectSwitcher({
  onProjectChange,
}: {
  onProjectChange?: (projectId: string | null) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSelectedId(stored);

    const supabase = createClient();
    supabase
      .from("projects")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) {
          setProjects(data);
          // If stored project no longer exists, select first
          if (stored && !data.find((p) => p.id === stored) && data.length > 0) {
            setSelectedId(data[0].id);
            localStorage.setItem(STORAGE_KEY, data[0].id);
          }
          // If nothing stored, select first
          if (!stored && data.length > 0) {
            setSelectedId(data[0].id);
            localStorage.setItem(STORAGE_KEY, data[0].id);
          }
        }
      });
  }, []);

  useEffect(() => {
    onProjectChange?.(selectedId);
  }, [selectedId, onProjectChange]);

  const selected = projects.find((p) => p.id === selectedId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
      >
        <FolderKanban className="size-4 text-muted-foreground" />
        <span>{selected?.name ?? "Select project..."}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-popover py-1 shadow-lg">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  setSelectedId(project.id);
                  localStorage.setItem(STORAGE_KEY, project.id);
                  window.dispatchEvent(new Event(PROJECT_CHANGE_EVENT));
                  setOpen(false);
                }}
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
              <p className="px-3 py-2 text-sm text-muted-foreground">No projects found</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export { STORAGE_KEY };
