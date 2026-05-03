"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Mail } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui/tabs";
import { FollowUpChecklist } from "@/components/shared/follow-up-checklist";
import { RiskList, type RiskItem } from "@/components/shared/risk-list";
import { AddExtractionForm } from "./add-extraction-form";
import { updateExtractionAction, deleteExtractionAction } from "../actions";
import { RegenerateMenu } from "./regenerate-menu";
import type { PersonForAssignment } from "@repo/database/queries/people";

interface Extraction {
  id: string;
  type: string;
  content: string;
  confidence: number | null;
  transcript_ref: string | null;
  metadata?: Record<string, unknown> | null;
  reasoning?: string | null;
}

interface ExtractionTabsPanelProps {
  extractions: Extraction[];
  promotedExtractionIds?: string[];
  peopleForAssignment?: PersonForAssignment[];
  meetingId?: string;
  editable?: boolean;
}

const TAB_RISKS = "risks";
const TAB_FOLLOWUPS = "followups";

export function ExtractionTabsPanel({
  extractions,
  promotedExtractionIds,
  peopleForAssignment,
  meetingId,
  editable,
}: ExtractionTabsPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const risks = extractions.filter((e) => e.type === "risk");
  const actionItems = extractions.filter((e) => e.type === "action_item");

  // Default naar Risico's wanneer die er zijn, anders Opvolgsuggesties.
  // Historische meetings (alleen action_items) openen dus direct op de
  // juiste tab zonder extra klik.
  const defaultTab = risks.length > 0 ? TAB_RISKS : TAB_FOLLOWUPS;

  async function handleEditExtraction(id: string, content: string) {
    if (!meetingId) return;
    const result = await updateExtractionAction({ id, content, meetingId });
    if ("error" in result) setError(result.error);
  }

  async function handleDeleteExtraction(id: string) {
    if (!meetingId) return;
    const result = await deleteExtractionAction({ id, meetingId });
    if ("error" in result) setError(result.error);
    else router.refresh();
  }

  return (
    <Tabs defaultValue={defaultTab}>
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background/95 backdrop-blur-sm px-6 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value={TAB_RISKS}>
              <AlertTriangle className="mr-1.5 size-4 text-red-600" />
              Risico&apos;s
              <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                {risks.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value={TAB_FOLLOWUPS}>
              <Mail className="mr-1.5 size-4 text-amber-500" />
              Opvolgsuggesties
              <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                {actionItems.length}
              </span>
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {editable && meetingId && <AddExtractionForm meetingId={meetingId} />}
            {meetingId && <RegenerateMenu meetingId={meetingId} />}
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      <TabsContent value={TAB_RISKS} className="p-6">
        <RiskList
          items={risks.map((r) => ({
            id: r.id,
            content: r.content,
            confidence: r.confidence,
            transcript_ref: r.transcript_ref,
            reasoning: r.reasoning ?? null,
            metadata: (r.metadata ?? null) as RiskItem["metadata"],
          }))}
          onEdit={editable && meetingId ? handleEditExtraction : undefined}
          onDelete={editable && meetingId ? handleDeleteExtraction : undefined}
        />
      </TabsContent>

      <TabsContent value={TAB_FOLLOWUPS} className="p-6">
        <FollowUpChecklist
          items={actionItems}
          promotedIds={promotedExtractionIds}
          people={peopleForAssignment}
          onEdit={editable && meetingId ? handleEditExtraction : undefined}
          onDelete={editable && meetingId ? handleDeleteExtraction : undefined}
        />
      </TabsContent>
    </Tabs>
  );
}
