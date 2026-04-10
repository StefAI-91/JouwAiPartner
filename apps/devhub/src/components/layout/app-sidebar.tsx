"use client";

import { SidebarNav } from "./sidebar-nav";

export function AppSidebar() {
  return (
    <aside className="hidden h-full w-56 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4">
        <img
          src="https://gattprzzbpnyygzgzvxg.supabase.co/storage/v1/object/public/Public/images/679a9066567ec01242301e4d_jap_logo_zwart_gradient.svg"
          alt="Jouw AI Partner"
          className="h-9 w-auto"
        />
        <span className="font-heading text-xl font-semibold text-primary">DevHub</span>
      </div>

      <SidebarNav iconSize="size-5" linkClassName="py-2 text-[0.9rem]" />
    </aside>
  );
}
