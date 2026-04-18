"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban } from "lucide-react";
import { WorkspaceSwitcher } from "@repo/ui/workspace-switcher";
import { cn } from "@repo/ui/utils";

interface AppSidebarClientProps {
  projects: { id: string; name: string }[];
}

export function AppSidebarClient({ projects }: AppSidebarClientProps) {
  const pathname = usePathname();
  const overviewActive = pathname === "/";

  return (
    <aside className="hidden w-56 flex-col border-r border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-screen">
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        <img
          src="https://gattprzzbpnyygzgzvxg.supabase.co/storage/v1/object/public/Public/images/679a9066567ec01242301e4d_jap_logo_zwart_gradient.svg"
          alt="Jouw AI Partner"
          className="h-8 w-auto"
        />
      </div>

      {/* Workspace switcher */}
      <div className="px-2 pb-2">
        <WorkspaceSwitcher current="portal" />
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 pt-2 pb-4">
        <div className="space-y-0.5">
          <Link
            href="/"
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
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={project.id}
                  href={href}
                  className={cn(
                    "flex items-center rounded-md px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                >
                  <span className="truncate">{project.name}</span>
                </Link>
              );
            })}
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
