"use client";

import { WorkspaceSwitcher } from "@repo/ui/workspace-switcher";
import { UserMenu } from "@repo/ui/user-menu";
import { signOutAction } from "@repo/auth/actions";
import { SidebarNav } from "./sidebar-nav";

interface AppSidebarProps {
  userEmail?: string | null;
  userFullName?: string | null;
}

export function AppSidebar({ userEmail, userFullName }: AppSidebarProps) {
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
        <WorkspaceSwitcher current="devhub" />
      </div>

      <SidebarNav iconSize="size-5" linkClassName="py-2 text-[0.9rem]" />

      {/* User menu with logout */}
      <div className="border-t border-sidebar-border px-2 py-2">
        <UserMenu
          email={userEmail}
          fullName={userFullName}
          onSignOut={signOutAction}
          variant="dark"
        />
      </div>
    </aside>
  );
}
