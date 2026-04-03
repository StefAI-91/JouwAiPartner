"use client";

import { useState } from "react";
import { ExtractionCard } from "@/components/shared/extraction-card";
import {
  EXTRACTION_TYPE_ORDER,
  EXTRACTION_TYPE_LABELS,
  EXTRACTION_TYPE_ICONS,
  EXTRACTION_TYPE_COLORS,
} from "@/components/shared/extraction-constants";
import type { PersonForAssignment } from "@repo/database/queries/people";

interface Extraction {
  id: string;
  type: string;
  content: string;
  confidence: number | null;
  transcript_ref: string | null;
}

interface ExtractionTabsPanelProps {
  extractions: Extraction[];
  promotedExtractionIds?: string[];
  peopleForAssignment?: PersonForAssignment[];
}

export function ExtractionTabsPanel({
  extractions,
  promotedExtractionIds,
  peopleForAssignment,
}: ExtractionTabsPanelProps) {
  const grouped = new Map<string, Extraction[]>();
  for (const ext of extractions) {
    const list = grouped.get(ext.type) ?? [];
    list.push(ext);
    grouped.set(ext.type, list);
  }

  const tabs = EXTRACTION_TYPE_ORDER.filter(
    (type) => grouped.has(type) && grouped.get(type)!.length > 0,
  ).map((type) => ({
    type,
    label: EXTRACTION_TYPE_LABELS[type],
    count: grouped.get(type)!.length,
    Icon: EXTRACTION_TYPE_ICONS[type],
    color: EXTRACTION_TYPE_COLORS[type]?.color ?? "#6B7280",
  }));

  const [activeTab, setActiveTab] = useState<string>(() => {
    for (const type of EXTRACTION_TYPE_ORDER) {
      if (extractions.some((e) => e.type === type)) return type;
    }
    return EXTRACTION_TYPE_ORDER[0];
  });

  const activeItems = grouped.get(activeTab) ?? [];

  if (extractions.length === 0) {
    return <p className="text-sm text-muted-foreground">Geen extracties</p>;
  }

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background/95 backdrop-blur-sm px-6 pt-4">
        <h2 className="mb-3 text-base font-semibold">Extracties</h2>
        <div className="flex gap-1 overflow-x-auto pb-0">
          {tabs.map(({ type, label, count, Icon, color }) => {
            const isActive = type === activeTab;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setActiveTab(type)}
                className={`flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {Icon && (
                  <Icon className="size-3.5" style={{ color: isActive ? color : undefined }} />
                )}
                {label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 p-6">
        {activeItems.map((ext) => (
          <ExtractionCard
            key={ext.id}
            extraction={ext}
            readOnly
            showPromote
            isPromoted={promotedExtractionIds?.includes(ext.id)}
            people={peopleForAssignment}
          />
        ))}
        {activeItems.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Geen {EXTRACTION_TYPE_LABELS[activeTab]?.toLowerCase()} gevonden
          </p>
        )}
      </div>
    </>
  );
}
