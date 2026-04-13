"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { FocusProject } from "@repo/database/queries/projects";
import { WorkspaceSwitcher } from "@repo/ui/workspace-switcher";
import {
  primaryNavItems,
  secondaryNavItems,
  adminNavItems,
  isNavItemActive,
  isFocusProjectActive,
  type NavItem,
} from "@/lib/constants/navigation";

function MenuLink({
  item,
  pathname,
  badge,
  small,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  badge?: number;
  small?: boolean;
  onNavigate: () => void;
}) {
  const isActive = isNavItemActive(item.href, pathname);
  const Icon = item.icon;

  return (
    <Link href={item.href} onClick={onNavigate}>
      <div
        className={`flex items-center gap-4 rounded-xl px-4 ${small ? "py-2.5" : "py-3.5"} ${small ? "text-sm" : "text-base"} font-medium transition-colors ${
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        }`}
      >
        <Icon className={`${small ? "h-5 w-5" : "h-6 w-6"} shrink-0`} />
        <span className="flex-1">{item.label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
    </Link>
  );
}

function FocusProjectMenuLink({
  project,
  pathname,
  onNavigate,
}: {
  project: FocusProject;
  pathname: string;
  onNavigate: () => void;
}) {
  const isActive = isFocusProjectActive(project.id, pathname);

  return (
    <Link
      href={`/projects/${project.id}`}
      onClick={onNavigate}
      className={`block rounded-xl px-4 py-2.5 transition-colors ${
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      }`}
    >
      <div className="truncate text-sm font-medium">{project.name}</div>
      {project.organization_name && (
        <div className="truncate text-[11px] text-sidebar-foreground/50">
          {project.organization_name}
        </div>
      )}
    </Link>
  );
}

export function SideMenu({
  reviewCount,
  focusProjects = [],
}: {
  reviewCount?: number;
  focusProjects?: FocusProject[];
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const badges: Record<string, number | undefined> = { reviewCount };

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-medium transition-all hover:bg-muted hover:text-foreground"
        aria-label="Menu openen"
      >
        <Menu className="h-6 w-6" />
      </button>

      {mounted &&
        createPortal(
          <>
            {/* Overlay */}
            {open && (
              <div
                className="fixed inset-0 z-50 bg-black/10 backdrop-blur-xs"
                onClick={close}
                aria-hidden="true"
              />
            )}

            {/* Slide-in panel */}
            <div
              className={`fixed inset-y-0 left-0 z-50 flex h-full w-[70%] flex-col border-r bg-sidebar shadow-lg transition-transform duration-200 ease-in-out ${
                open ? "translate-x-0" : "-translate-x-full"
              }`}
              role="dialog"
              aria-modal="true"
              aria-label="Navigatiemenu"
            >
              <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-5">
                <img
                  src="https://gattprzzbpnyygzgzvxg.supabase.co/storage/v1/object/public/Public/images/679a9066567ec01242301e4d_jap_logo_zwart_gradient.svg"
                  alt="Jouw AI Partner"
                  className="h-8 w-auto"
                />
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted"
                  aria-label="Menu sluiten"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="border-b border-sidebar-border px-4 py-3">
                <WorkspaceSwitcher current="cockpit" />
              </div>

              <nav className="flex flex-col gap-1.5 overflow-y-auto px-4 py-5">
                {primaryNavItems.map((item) => (
                  <MenuLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    badge={item.badgeKey ? (badges[item.badgeKey] ?? undefined) : undefined}
                    onNavigate={close}
                  />
                ))}

                {/* Focus section — active projects as shortcuts */}
                {focusProjects.length > 0 && (
                  <>
                    <div className="mb-1 mt-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                      Actieve projecten
                    </div>
                    {focusProjects.map((project) => (
                      <FocusProjectMenuLink
                        key={project.id}
                        project={project}
                        pathname={pathname}
                        onNavigate={close}
                      />
                    ))}
                  </>
                )}

                {/* Bronnen section */}
                <div className="mb-1 mt-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  Bronnen
                </div>
                {secondaryNavItems.map((item) => (
                  <MenuLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    small
                    onNavigate={close}
                  />
                ))}

                {/* Admin section */}
                <div className="mb-1 mt-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  Admin
                </div>
                {adminNavItems.map((item) => (
                  <MenuLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    small
                    onNavigate={close}
                  />
                ))}
              </nav>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
