"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { ProjectSwitcher } from "./project-switcher";
import { MobileSidebar } from "./mobile-sidebar";
import { SearchInput } from "./search-input";

interface Project {
  id: string;
  name: string;
}

export function TopBar({ projects }: { projects: Project[] }) {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  const newIssueHref = projectId ? `/issues/new?project=${projectId}` : "/issues/new";

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <div className="flex items-center gap-2">
        <MobileSidebar />
        <ProjectSwitcher projects={projects} />
      </div>

      <div className="ml-2 flex-1">
        <SearchInput />
      </div>

      <Link
        href={newIssueHref}
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
      >
        <Plus className="size-4" />
        Nieuw issue
      </Link>
    </header>
  );
}
