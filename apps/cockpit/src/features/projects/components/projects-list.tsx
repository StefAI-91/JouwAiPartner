"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@repo/ui/utils";
import {
  PROJECT_SEGMENTS,
  SEGMENT_LABELS,
  getProjectSegment,
  type ProjectSegment,
} from "@repo/database/constants/projects";
import type { ProjectListItem } from "@repo/database/queries/projects";
import { ProjectCard } from "./project-card";

const tabBase =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/50";
const tabActive = "bg-background text-foreground shadow-sm dark:bg-card";
const tabInactive = "text-muted-foreground hover:text-foreground";

interface ProjectsListProps {
  projects: ProjectListItem[];
}

function isSegment(value: string | null): value is ProjectSegment {
  return value !== null && (PROJECT_SEGMENTS as readonly string[]).includes(value);
}

export function ProjectsList({ projects }: ProjectsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const param = searchParams.get("segment");
  const activeSegment: ProjectSegment = isSegment(param) ? param : "active";

  const { counts, filtered } = useMemo(() => {
    const counts: Record<ProjectSegment, number> = { sales: 0, active: 0, other: 0 };
    const filtered: ProjectListItem[] = [];
    for (const project of projects) {
      const segment = getProjectSegment(project.status);
      counts[segment]++;
      if (segment === activeSegment) filtered.push(project);
    }
    return { counts, filtered };
  }, [projects, activeSegment]);

  function switchSegment(segment: ProjectSegment) {
    router.replace(`/projects?segment=${segment}`, { scroll: false });
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="Project fase"
        className="inline-flex items-center gap-1 rounded-lg bg-muted p-1"
      >
        {PROJECT_SEGMENTS.map((segment) => (
          <button
            key={segment}
            type="button"
            role="tab"
            aria-selected={activeSegment === segment}
            onClick={() => switchSegment(segment)}
            className={cn(tabBase, activeSegment === segment ? tabActive : tabInactive)}
          >
            {SEGMENT_LABELS[segment]}{" "}
            <span className="ml-1.5 tabular-nums text-muted-foreground">{counts[segment]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Geen projecten in deze fase.</p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </>
  );
}
