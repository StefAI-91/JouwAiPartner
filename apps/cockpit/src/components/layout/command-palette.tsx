"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, Search, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@repo/ui/dialog";
import {
  allNavItems,
  dailyNavItems,
  setupNavItems,
  sourceNavItems,
  type NavItem,
} from "@/lib/constants/navigation";
import { useCommandPalette } from "./command-palette-context";

type Group = "Dagelijks" | "Bronnen" | "Setup & beheer" | "Projecten";

interface PaletteEntry {
  id: string;
  label: string;
  icon: LucideIcon;
  group: Group;
  href: string;
  keywords?: string[];
}

function groupForItem(item: NavItem): Group {
  if (dailyNavItems.includes(item)) return "Dagelijks";
  if (sourceNavItems.includes(item)) return "Bronnen";
  if (setupNavItems.includes(item)) return "Setup & beheer";
  return "Dagelijks";
}

function PaletteContent({ onSelect }: { onSelect: (href: string) => void }) {
  const { focusProjects } = useCommandPalette();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const entries = useMemo<PaletteEntry[]>(() => {
    const fromRoutes: PaletteEntry[] = allNavItems.map((item) => ({
      id: item.href,
      label: item.label,
      icon: item.icon as LucideIcon,
      group: groupForItem(item),
      href: item.href,
      keywords: item.keywords,
    }));
    const fromProjects: PaletteEntry[] = focusProjects.map((p) => ({
      id: `project-${p.id}`,
      label: p.name,
      icon: FolderKanban,
      group: "Projecten",
      href: `/projects/${p.id}`,
      keywords: p.organization_name ? [p.organization_name] : undefined,
    }));
    return [...fromRoutes, ...fromProjects];
  }, [focusProjects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const haystack = [e.label, e.group, ...(e.keywords ?? [])].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [query, entries]);

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteEntry[]>();
    filtered.forEach((e) => {
      const arr = map.get(e.group) ?? [];
      arr.push(e);
      map.set(e.group, arr);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const safeIndex = Math.min(activeIndex, Math.max(0, filtered.length - 1));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(Math.min(safeIndex + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(Math.max(safeIndex - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entry = filtered[safeIndex];
      if (entry) onSelect(entry.href);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Zoek pagina, project of instelling…"
          className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
        />
        <kbd className="rounded border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          esc
        </kbd>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Geen resultaten voor &quot;{query}&quot;.
          </div>
        ) : (
          grouped.map(([group, items]) => (
            <div key={group} className="mb-2 last:mb-0">
              <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group}
              </div>
              {items.map((entry) => {
                const globalIndex = filtered.indexOf(entry);
                const isActive = globalIndex === safeIndex;
                const Icon = entry.icon;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(globalIndex)}
                    onClick={() => onSelect(entry.href)}
                    className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                      isActive ? "bg-muted text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{entry.label}</span>
                    <span className="hidden font-mono text-[10px] text-muted-foreground/60 sm:inline">
                      {entry.href}
                    </span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border/60 bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border/60 bg-background px-1 font-mono">↑↓</kbd>
            navigeer
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border/60 bg-background px-1 font-mono">↵</kbd>
            open
          </span>
        </div>
        <span>{filtered.length} resultaten</span>
      </div>
    </>
  );
}

export function CommandPalette() {
  const { open, openPalette, closePalette } = useCommandPalette();
  const router = useRouter();

  const handleSelect = (href: string) => {
    closePalette();
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? openPalette() : closePalette())}>
      <DialogContent className="max-w-xl overflow-hidden p-0">
        <DialogTitle className="sr-only">Zoek of spring naar pagina</DialogTitle>
        {open && <PaletteContent onSelect={handleSelect} />}
      </DialogContent>
    </Dialog>
  );
}
