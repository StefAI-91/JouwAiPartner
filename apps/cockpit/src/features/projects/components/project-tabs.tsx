"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/ui/utils";

// CC-005 — tab-navigatie boven project-detail. Layout-level zodat elke
// sub-route (Overzicht, Inbox) deze nav consistent toont zonder per-page
// duplicatie. Pure server-driven nav: geen state, alleen pathname-match
// voor active-styling.

const TABS = [
  { key: "overview", label: "Overzicht", suffix: "" },
  { key: "inbox", label: "Inbox", suffix: "/inbox" },
] as const;

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  return (
    <nav className="flex gap-1 border-b border-border px-4 lg:px-10" role="tablist">
      {TABS.map((tab) => {
        const href = `${base}${tab.suffix}`;
        const active = tab.suffix === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={tab.key}
            href={href}
            role="tab"
            aria-selected={active}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
