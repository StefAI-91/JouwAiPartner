"use client";

import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";

interface BreadcrumbProps {
  projects: { id: string; name: string }[];
}

interface Crumb {
  label: string;
}

function buildCrumbs(pathname: string, projects: { id: string; name: string }[]): Crumb[] {
  const root: Crumb = { label: "Projecten" };

  if (pathname === "/" || pathname === "") {
    return [root];
  }

  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] !== "projects" || !segments[1]) {
    return [root];
  }

  const project = projects.find((p) => p.id === segments[1]);
  const projectCrumb: Crumb = { label: project?.name ?? "Project" };

  const sub = segments[2];
  if (!sub) return [root, projectCrumb];
  if (sub === "issues") return [root, projectCrumb, { label: "Issues" }];
  if (sub === "feedback") return [root, projectCrumb, { label: "Feedback" }];
  return [root, projectCrumb, { label: sub }];
}

export function Breadcrumb({ projects }: BreadcrumbProps) {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname, projects);
  const last = crumbs[crumbs.length - 1];
  const middle = crumbs.length >= 2 ? crumbs[crumbs.length - 2] : null;
  const first = crumbs.length >= 3 ? crumbs[0] : null;

  return (
    <nav aria-label="Broodkruimels" className="flex min-w-0 items-center gap-2 text-sm">
      {first ? (
        <>
          <span className="hidden truncate text-muted-foreground md:inline">{first.label}</span>
          <ChevronRight
            aria-hidden
            className="hidden size-3.5 shrink-0 text-muted-foreground/60 md:inline"
          />
        </>
      ) : null}

      {middle ? (
        <>
          <span className="hidden truncate text-muted-foreground sm:inline">{middle.label}</span>
          <ChevronRight
            aria-hidden
            className="hidden size-3.5 shrink-0 text-muted-foreground/60 sm:inline"
          />
        </>
      ) : null}

      <span className="truncate font-medium text-foreground">{last.label}</span>
    </nav>
  );
}
