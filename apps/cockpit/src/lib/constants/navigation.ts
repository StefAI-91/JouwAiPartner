import {
  Home,
  BrainCircuit,
  ClipboardCheck,
  FolderKanban,
  BookUser,
  Calendar,
  Mail,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: "reviewCount";
}

/** Primary nav — shown in all nav components (5 items) */
export const primaryNavItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/intelligence", label: "Intelligence", icon: BrainCircuit },
  { href: "/review", label: "Review", icon: ClipboardCheck, badgeKey: "reviewCount" },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/directory", label: "Directory", icon: BookUser },
];

/** Secondary nav — "Bronnen" section, desktop sidebar + mobile sheet only */
export const secondaryNavItems: NavItem[] = [
  { href: "/meetings", label: "Meetings", icon: Calendar },
  { href: "/emails", label: "Emails", icon: Mail },
];

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
