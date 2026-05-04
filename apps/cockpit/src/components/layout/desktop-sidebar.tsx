"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Search, Settings } from "lucide-react";
import type { FocusProject } from "@repo/database/queries/projects";
import { WorkspaceSwitcher } from "@repo/ui/workspace-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import {
  dailyNavItems,
  sourceNavItems,
  setupNavItems,
  isNavItemActive,
  isFocusProjectActive,
  type NavItem,
} from "@/lib/constants/navigation";
import { useCommandPalette } from "./command-palette-context";

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

function deriveInitial(email?: string | null): string {
  if (!email) return "?";
  const local = email.split("@")[0] ?? "";
  return (local[0] ?? "?").toUpperCase();
}

function AvatarMenu({ profile }: { profile: { email: string; role: string } | null }) {
  const initial = deriveInitial(profile?.email);
  const displayName = profile?.email?.split("@")[0] ?? "Gebruiker";
  const roleLabel = profile?.role === "admin" ? "Admin" : (profile?.role ?? "");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-[12px] font-semibold text-primary-foreground">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-foreground">{displayName}</div>
              {roleLabel && (
                <div className="truncate text-[11px] text-muted-foreground">{roleLabel}</div>
              )}
            </div>
            <Settings className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        }
      />
      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Setup &amp; beheer
        </DropdownMenuLabel>
        {setupNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={item.href}
              className="gap-2.5"
              render={<Link href={item.href} />}
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DesktopSidebar({
  reviewCount,
  focusProjects = [],
  inboxCount,
  profile,
}: {
  reviewCount?: number;
  focusProjects?: FocusProject[];
  inboxCount?: number;
  profile: { email: string; role: string } | null;
}) {
  const pathname = usePathname();
  const { openPalette } = useCommandPalette();
  const [bronnenOpen, setBronnenOpen] = useState(false);
  const badges: Record<string, number | undefined> = { reviewCount, inboxCount };

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

      {/* Search / palette trigger */}
      <div className="px-3 pb-1">
        <button
          type="button"
          onClick={openPalette}
          className="flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted/60"
          aria-label="Zoek of spring naar pagina"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Zoek of spring…</span>
          <kbd className="rounded border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/80">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Primary navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {dailyNavItems.map((item) => (
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

        {/* Bronnen section — collapsible */}
        <button
          type="button"
          onClick={() => setBronnenOpen((v) => !v)}
          className="mb-1 mt-4 flex items-center gap-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          aria-expanded={bronnenOpen}
        >
          {bronnenOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Bronnen
        </button>
        {bronnenOpen &&
          sourceNavItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} small />
          ))}
      </nav>

      {/* Avatar / setup menu — Tier 3 lives here */}
      <div className="border-t border-border/40 p-3">
        <AvatarMenu profile={profile} />
      </div>
    </aside>
  );
}
