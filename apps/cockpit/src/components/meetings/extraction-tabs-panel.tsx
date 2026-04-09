"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FollowUpChecklist } from "@/components/shared/follow-up-checklist";
import { AddExtractionForm } from "@/components/meetings/add-extraction-form";
import { updateExtractionAction, deleteExtractionAction } from "@/actions/entities";
import { RegenerateMenu } from "@/components/shared/regenerate-menu";
import { Mail } from "lucide-react";
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
  meetingId?: string;
  editable?: boolean;
}

export function ExtractionTabsPanel({
  extractions,
  promotedExtractionIds,
  peopleForAssignment,
  meetingId,
  editable,
}: ExtractionTabsPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const actionItems = extractions.filter((e) => e.type === "action_item");

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background/95 backdrop-blur-sm px-6 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-amber-500" />
            <h2 className="text-base font-semibold">Opvolgsuggesties</h2>
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
              {actionItems.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {editable && meetingId && <AddExtractionForm meetingId={meetingId} />}
            {meetingId && <RegenerateMenu meetingId={meetingId} />}
          </div>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}
        <FollowUpChecklist
          items={actionItems}
          promotedIds={promotedExtractionIds}
          people={peopleForAssignment}
          onEdit={
            editable && meetingId
              ? async (id, content) => {
                  const result = await updateExtractionAction({
                    id,
                    content,
                    meetingId: meetingId!,
                  });
                  if ("error" in result) setError(result.error);
                }
              : undefined
          }
          onDelete={
            editable && meetingId
              ? async (id) => {
                  const result = await deleteExtractionAction({ id, meetingId: meetingId! });
                  if ("error" in result) setError(result.error);
                  else router.refresh();
                }
              : undefined
          }
        />
      </div>
    </>
  );
}
