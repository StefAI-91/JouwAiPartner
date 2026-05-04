import {
  Home,
  Inbox,
  BrainCircuit,
  ClipboardCheck,
  FolderKanban,
  BookUser,
  Calendar,
  Mail,
  Users,
  Receipt,
  Bot,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: "reviewCount" | "inboxCount";
  /** Extra terms used by the command palette to broaden search hits. */
  keywords?: string[];
}

/**
 * Daily drivers — always visible in the rail. The 5 verbs of a working day:
 * capture, triage, think, work, navigate-to-project.
 */
export const dailyNavItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/inbox", label: "Inbox", icon: Inbox, badgeKey: "inboxCount" },
  { href: "/review", label: "Review", icon: ClipboardCheck, badgeKey: "reviewCount" },
  { href: "/intelligence", label: "Intelligence", icon: BrainCircuit },
  { href: "/projects", label: "Projects", icon: FolderKanban },
];

/**
 * Bronnen — referenced data, not workflow starts. Collapsed by default in the
 * rail. Reachable via deep-links from projects, search, and ⌘K.
 */
export const sourceNavItems: NavItem[] = [
  { href: "/meetings", label: "Meetings", icon: Calendar },
  { href: "/emails", label: "Emails", icon: Mail },
  {
    href: "/directory",
    label: "Directory",
    icon: BookUser,
    keywords: ["clients", "people"],
  },
];

/**
 * Setup & beheer — weekly-or-less. Lives behind the avatar menu, not in the
 * daily rail. Cockpit is admin-only (DH-015 middleware), so no extra role
 * check needed.
 */
export const setupNavItems: NavItem[] = [
  { href: "/administratie", label: "Administratie", icon: Receipt },
  { href: "/admin/team", label: "Team", icon: Users },
  { href: "/agents", label: "Agents", icon: Bot },
];

/** Single source of truth for the command palette. Order matters for grouping. */
export const allNavItems: NavItem[] = [...dailyNavItems, ...sourceNavItems, ...setupNavItems];

/** Check if a nav item should be highlighted for the given pathname */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/directory") {
    return (
      pathname.startsWith("/directory") ||
      pathname.startsWith("/clients") ||
      pathname.startsWith("/people")
    );
  }
  // /projects is only active on the list page itself — not when viewing a
  // specific project, because the focus-shortcut for that project takes over.
  if (href === "/projects") return pathname === "/projects";
  return pathname.startsWith(href);
}

/** Check if a focus-project shortcut should be highlighted */
export function isFocusProjectActive(projectId: string, pathname: string): boolean {
  return pathname === `/projects/${projectId}` || pathname.startsWith(`/projects/${projectId}/`);
}
