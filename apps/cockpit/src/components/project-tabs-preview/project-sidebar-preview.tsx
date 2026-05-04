"use client";

import { useState } from "react";
import { ClipboardList, Inbox, Layers, Lightbulb, Menu } from "lucide-react";
import { cn } from "@repo/ui/utils";
import { PANEL_META, PanelContent, ProjectHeader, type PanelKey } from "./panels";

const ICONS: Record<PanelKey, React.ComponentType<{ className?: string }>> = {
  overview: ClipboardList,
  activity: Layers,
  insights: Lightbulb,
  inbox: Inbox,
};

const DESCRIPTIONS: Record<PanelKey, string> = {
  overview: "Context, briefing, sprint, tijdlijn",
  activity: "Meetings, emails, segmenten",
  insights: "Actiepunten, beslissingen, behoeften",
  inbox: "Open vragen voor PM-review",
};

/**
 * Variant 2 — linker sub-sidebar binnen de pagina-inhoud (zoals
 * portal het al doet voor projecten). Twee-koloms layout: nav links,
 * panel rechts. Mobiel klapt de nav in een dropdown.
 */
export function ProjectSidebarPreview() {
  const [active, setActive] = useState<PanelKey>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-col">
      <PreviewBanner />

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Mobile bar — toont actieve sectie + toggle */}
        <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3 lg:hidden">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Sectie
            </p>
            <p className="text-sm font-semibold text-foreground">
              {PANEL_META.find((p) => p.key === active)?.label}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            aria-expanded={mobileNavOpen}
          >
            <Menu className="size-3.5" />
            {mobileNavOpen ? "Sluiten" : "Wisselen"}
          </button>
        </div>

        {/* Mobile dropdown nav */}
        {mobileNavOpen ? (
          <nav className="border-b border-border bg-white px-2 py-2 lg:hidden">
            <SidebarItems
              active={active}
              onSelect={(key) => {
                setActive(key);
                setMobileNavOpen(false);
              }}
            />
          </nav>
        ) : null}

        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-border bg-gray-50/40 p-3 lg:block">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Project
          </p>
          <p className="mb-4 truncate px-3 text-sm font-semibold text-foreground">Unova</p>
          <SidebarItems active={active} onSelect={setActive} />
        </aside>

        {/* Panel */}
        <main className="flex-1 px-4 py-8 lg:px-10">
          <ProjectHeader />
          <div className="mt-8">
            <PanelContent panel={active} />
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarItems({
  active,
  onSelect,
}: {
  active: PanelKey;
  onSelect: (key: PanelKey) => void;
}) {
  return (
    <ul className="space-y-0.5">
      {PANEL_META.map((item) => {
        const Icon = ICONS[item.key];
        const isActive = active === item.key;
        return (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => onSelect(item.key)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-md px-3 py-2 text-left transition-colors",
                isActive
                  ? "bg-white text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:bg-white/60 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-[18px] shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-700">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                  {DESCRIPTIONS[item.key]}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function PreviewBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 lg:px-10">
      <span className="font-semibold">Preview · variant B — linker sub-sidebar</span> · vergelijk
      met{" "}
      <a href="/project-tabs-preview" className="font-medium underline hover:text-amber-700">
        ← variant A (top tabs)
      </a>
    </div>
  );
}
