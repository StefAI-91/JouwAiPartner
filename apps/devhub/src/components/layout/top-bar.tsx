"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { ProjectSwitcher } from "./project-switcher";
import { MobileSidebar } from "./mobile-sidebar";

interface Project {
  id: string;
  name: string;
}

export function TopBar({
  projects,
  userEmail,
  userFullName,
}: {
  projects: Project[];
  userEmail?: string | null;
  userFullName?: string | null;
}) {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  const newIssueHref = projectId ? `/issues/new?project=${projectId}` : "/issues/new";

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-2">
        <MobileSidebar userEmail={userEmail} userFullName={userFullName} />
        <ProjectSwitcher projects={projects} />
      </div>

      <Link
        href={newIssueHref}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
      >
        <Plus className="size-4" />
        Nieuw issue
      </Link>
    </header>
  );
}
