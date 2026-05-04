"use client";

import { useState } from "react";
import { CombinedExtractionsSection, type CombinedItem } from "./combined-extractions-section";

interface Extraction {
  id: string;
  type: string;
  content: string;
  confidence: number | null;
  transcript_ref: string | null;
  metadata: Record<string, unknown>;
  meeting: { id: string; title: string | null } | null;
}

interface EmailExtraction {
  id: string;
  type: string;
  content: string;
  confidence: number | null;
  source_ref: string | null;
  metadata: Record<string, unknown>;
  email: { id: string; subject: string | null } | null;
}

const TABS = ["action_items", "decisions", "needs_insights"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  action_items: "Actiepunten",
  decisions: "Beslissingen",
  needs_insights: "Behoeften & Inzichten",
};

interface InsightsSectionsProps {
  extractions: Extraction[];
  emailExtractions: EmailExtraction[];
}

export function InsightsSections({ extractions, emailExtractions }: InsightsSectionsProps) {
  const allActionItems: CombinedItem[] = [
    ...extractions.filter((e) => e.type === "action_item"),
    ...emailExtractions.filter((e) => e.type === "action_item"),
  ];
  const allDecisions: CombinedItem[] = [
    ...extractions.filter((e) => e.type === "decision"),
    ...emailExtractions.filter((e) => e.type === "decision"),
  ];
  const allNeedsInsights: CombinedItem[] = [
    ...extractions.filter((e) => e.type === "need" || e.type === "insight"),
    ...emailExtractions.filter((e) => e.type === "need" || e.type === "insight"),
  ];

  const counts: Record<Tab, number> = {
    action_items: allActionItems.length,
    decisions: allDecisions.length,
    needs_insights: allNeedsInsights.length,
  };

  const [activeTab, setActiveTab] = useState<Tab>("action_items");

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-border/50 pb-px">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "border-b-2 border-[#006B3F] text-[#006B3F]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {TAB_LABELS[tab]}
            {counts[tab] > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs">
                {counts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="pt-6">
        {activeTab === "action_items" && (
          <CombinedExtractionsSection items={allActionItems} type="action_item" />
        )}
        {activeTab === "decisions" && (
          <CombinedExtractionsSection items={allDecisions} type="decision" />
        )}
        {activeTab === "needs_insights" && (
          <CombinedExtractionsSection items={allNeedsInsights} type="needs_insights" />
        )}
      </div>
    </div>
  );
}
