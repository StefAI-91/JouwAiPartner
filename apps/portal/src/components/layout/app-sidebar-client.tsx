"use client";

import { SidebarContent } from "./sidebar-content";

interface AppSidebarClientProps {
  projects: { id: string; name: string }[];
}

export function AppSidebarClient({ projects }: AppSidebarClientProps) {
  return (
    <aside className="hidden w-56 flex-col border-r border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-screen">
      <SidebarContent projects={projects} />
    </aside>
  );
}
