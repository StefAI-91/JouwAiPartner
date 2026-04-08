"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FollowUpChecklist } from "@/components/shared/follow-up-checklist";
import { AddExtractionForm } from "@/components/meetings/add-extraction-form";
import { updateExtractionAction, deleteExtractionAction } from "@/actions/entities";
import { regenerateMeetingAction } from "@/actions/meetings";
import { Mail, RefreshCw } from "lucide-react";
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
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actionItems = extractions.filter((e) => e.type === "action_item");

  async function handleRegenerate() {
    if (!meetingId) return;
    setRegenerating(true);
    setError(null);
    const result = await regenerateMeetingAction({ meetingId });
    if ("error" in result) {
      setError(result.error);
      setRegenerating(false);
      return;
    }
    router.refresh();
    setRegenerating(false);
  }

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
            {meetingId && (
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={regenerating}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${regenerating ? "animate-spin" : ""}`} />
                {regenerating ? "Bezig..." : "Regenereer"}
              </button>
            )}
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
              ? (id, content) => {
                  updateExtractionAction({ id, content, meetingId: meetingId! });
                }
              : undefined
          }
          onDelete={
            editable && meetingId
              ? (id) => {
                  deleteExtractionAction({ id, meetingId: meetingId! });
                  router.refresh();
                }
              : undefined
          }
        />
      </div>
    </>
  );
}
