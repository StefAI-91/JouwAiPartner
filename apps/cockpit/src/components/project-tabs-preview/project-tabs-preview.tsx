"use client";

import { useState } from "react";
import { cn } from "@repo/ui/utils";
import { PANEL_META, PanelContent, ProjectHeader, type PanelKey } from "./panels";

/**
 * Variant 1 — top-tabs boven de pagina-inhoud. Klassieke tab-bar
 * (zoals nu Overzicht/Inbox), nu met 4 tabs.
 */
export function ProjectTabsPreview() {
  const [active, setActive] = useState<PanelKey>("overview");

  return (
    <div className="flex min-h-full flex-col">
      <PreviewBanner />

      <nav
        className="flex gap-1 overflow-x-auto border-b border-border px-4 lg:px-10"
        role="tablist"
      >
        {PANEL_META.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.key)}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {tab.badge ? (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-700">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 px-4 py-8 lg:px-10">
        <ProjectHeader />
        <div className="mt-8">
          <PanelContent panel={active} />
        </div>
      </div>
    </div>
  );
}

function PreviewBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 lg:px-10">
      <span className="font-semibold">Preview · variant A — top tabs</span> · vergelijk met{" "}
      <a href="/project-sidebar-preview" className="font-medium underline hover:text-amber-700">
        variant B (linker sub-sidebar) →
      </a>
    </div>
  );
}
