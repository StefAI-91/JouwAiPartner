"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FocusProject } from "@repo/database/queries/projects";
import { WorkspaceSwitcher } from "@repo/ui/workspace-switcher";
import { UserMenu } from "@repo/ui/user-menu";
import { signOutAction } from "@repo/auth/actions";
import {
  primaryNavItems,
  secondaryNavItems,
  adminNavItems,
  isNavItemActive,
  isFocusProjectActive,
  type NavItem,
} from "@/lib/constants/navigation";

function NavLink({
  item,
  pathname,
  badge,
  small,
}: {
  item: NavItem;
  pathname: string;
  badge?: number;
  small?: boolean;
}) {
  const isActive = isNavItemActive(item.href, pathname);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg px-3 ${small ? "py-1.5" : "py-2"} text-sm font-medium transition-colors ${
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }`}
    >
      <Icon className={`${small ? "h-4 w-4" : "h-4.5 w-4.5"} shrink-0`} />
      <span className="flex-1">{item.label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

function FocusProjectLink({ project, pathname }: { project: FocusProject; pathname: string }) {
  const isActive = isFocusProjectActive(project.id, pathname);

  return (
    <Link
      href={`/projects/${project.id}`}
      className={`block rounded-lg px-3 py-1.5 transition-colors ${
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }`}
    >
      <div className="truncate text-[13px] font-medium">{project.name}</div>
      {project.organization_name && (
        <div className="truncate text-[10.5px] text-muted-foreground/70">
          {project.organization_name}
        </div>
      )}
    </Link>
  );
}

export function DesktopSidebar({
  reviewCount,
  focusProjects = [],
  userEmail,
  userFullName,
}: {
  reviewCount?: number;
  focusProjects?: FocusProject[];
  userEmail?: string | null;
  userFullName?: string | null;
}) {
  const pathname = usePathname();
  const badges: Record<string, number | undefined> = { reviewCount };

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border/50 bg-white/60 backdrop-blur-sm lg:flex lg:flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4">
        <img
          src="https://gattprzzbpnyygzgzvxg.supabase.co/storage/v1/object/public/Public/images/679a9066567ec01242301e4d_jap_logo_zwart_gradient.svg"
          alt="Jouw AI Partner"
          className="h-7 w-auto"
        />
      </div>

      {/* Workspace switcher */}
      <div className="px-3 pb-2">
        <WorkspaceSwitcher current="cockpit" />
      </div>

      {/* Primary navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {primaryNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            badge={item.badgeKey ? (badges[item.badgeKey] ?? undefined) : undefined}
          />
        ))}

        {/* Focus section — active projects as shortcuts */}
        {focusProjects.length > 0 && (
          <>
            <div className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Actieve projecten
            </div>
            {focusProjects.map((project) => (
              <FocusProjectLink key={project.id} project={project} pathname={pathname} />
            ))}
          </>
        )}

        {/* Bronnen section */}
        <div className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Bronnen
        </div>
        {secondaryNavItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} small />
        ))}

        <div className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Admin
        </div>
        {adminNavItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} small />
        ))}
      </nav>

      {/* User menu with logout */}
      <div className="border-t border-border/50 px-3 py-3">
        <UserMenu
          email={userEmail}
          fullName={userFullName}
          onSignOut={signOutAction}
          variant="sidebar"
        />
      </div>
    </aside>
  );
}
