"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, FolderKanban } from "lucide-react";
import { cn } from "@repo/ui/utils";

interface Project {
  id: string;
  name: string;
}

export function ProjectSwitcher({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentProjectId = searchParams.get("project");
  const [open, setOpen] = useState(false);

  // Auto-select first project if none in URL
  const effectiveProjectId = currentProjectId ?? projects[0]?.id ?? null;

  const handleSelect = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("project", id);
      router.push(`/issues?${params.toString()}`);
      setOpen(false);
    },
    [router, searchParams],
  );

  const selected = projects.find((p) => p.id === effectiveProjectId);

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
                  project.id === effectiveProjectId && "bg-accent font-medium",
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
