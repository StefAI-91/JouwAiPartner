"use client";

import { WorkspaceSwitcher } from "@repo/ui/workspace-switcher";
import { SidebarNav } from "./sidebar-nav";

export function AppSidebar() {
  return (
    <aside className="hidden h-full w-56 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
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
        <WorkspaceSwitcher current="devhub" />
      </div>

      <SidebarNav iconSize="size-5" linkClassName="py-2 text-[0.9rem]" />
    </aside>
  );
}
