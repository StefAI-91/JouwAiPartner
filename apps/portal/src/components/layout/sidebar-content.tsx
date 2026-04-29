"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  FolderKanban,
  Inbox,
  ListChecks,
  MessageCircle,
} from "lucide-react";
import { WorkspaceSwitcher } from "@repo/ui/workspace-switcher";
import { cn } from "@repo/ui/utils";

interface SidebarContentProps {
  projects: { id: string; name: string }[];
  onNavigate?: () => void;
}

const PROJECT_PATH_RE = /^\/projects\/([^/]+)/;

function detectActiveProjectId(pathname: string): string | null {
  const match = pathname.match(PROJECT_PATH_RE);
  return match ? (match[1] ?? null) : null;
}

export function SidebarContent({ projects, onNavigate }: SidebarContentProps) {
  const pathname = usePathname();
  const activeProjectId = detectActiveProjectId(pathname);
  const activeProject = activeProjectId
    ? (projects.find((p) => p.id === activeProjectId) ?? null)
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <div className="flex h-14 items-center px-4">
        <img
          src="https://gattprzzbpnyygzgzvxg.supabase.co/storage/v1/object/public/Public/images/679a9066567ec01242301e4d_jap_logo_zwart_gradient.svg"
          alt="Jouw AI Partner"
          className="h-8 w-auto"
        />
      </div>

      <div className="px-2 pb-2">
        <WorkspaceSwitcher current="portal" />
      </div>

      {activeProject ? (
        <ProjectModeNav project={activeProject} pathname={pathname} onNavigate={onNavigate} />
      ) : (
        <ProjectsModeNav projects={projects} pathname={pathname} onNavigate={onNavigate} />
      )}
    </div>
  );
}

/* ─── Modus A — geen project geselecteerd ─────────────────────────── */

function ProjectsModeNav({
  projects,
  pathname,
  onNavigate,
}: {
  projects: { id: string; name: string }[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const overviewActive = pathname === "/";

  return (
    <nav className="flex-1 space-y-4 overflow-y-auto px-2 pt-2 pb-4">
      <div className="space-y-0.5">
        <Link
          href="/"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-[0.9rem] font-medium transition-colors",
            overviewActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
          )}
        >
          <FolderKanban className="size-5 shrink-0" />
          Projecten
        </Link>
      </div>

      {projects.length > 0 ? (
        <div className="space-y-0.5">
          <p className="px-3 text-[0.7rem] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Jouw projecten
          </p>
          {projects.map((project) => {
            const href = `/projects/${project.id}`;
            return (
              <Link
                key={project.id}
                href={href}
                onClick={onNavigate}
                className="flex items-center rounded-md px-3 py-1.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              >
                <span className="truncate">{project.name}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </nav>
  );
}

/* ─── Modus B — binnen een project ────────────────────────────────── */

function ProjectModeNav({
  project,
  pathname,
  onNavigate,
}: {
  project: { id: string; name: string };
  pathname: string;
  onNavigate?: () => void;
}) {
  const base = `/projects/${project.id}`;

  const items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { href: base, label: "Briefing", icon: ClipboardList },
    { href: `${base}/roadmap`, label: "Wat & wanneer", icon: ListChecks },
    { href: `${base}/meetings`, label: "Meetings", icon: CalendarDays },
    { href: `${base}/issues`, label: "Meldingen", icon: Inbox },
    { href: `${base}/feedback`, label: "Feedback geven", icon: MessageCircle },
  ];

  return (
    <nav className="flex-1 space-y-4 overflow-y-auto px-2 pt-2 pb-4">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-[0.78rem] text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground"
      >
        <ArrowLeft className="size-3.5 shrink-0" />
        Alle projecten
      </Link>

      <div className="px-3 pb-1">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          Project
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-sidebar-foreground">
          {project.name}
        </p>
      </div>

      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive = item.href === base ? pathname === base : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-[0.9rem] font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
