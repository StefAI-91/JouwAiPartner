"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FollowUpChecklist } from "@/components/shared/follow-up-checklist";
import { RiskList, type RiskItem } from "@/components/meetings/risk-list";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui/tabs";
import { ReviewActionBar } from "./review-action-bar";
import { MeetingTranscriptPanel } from "@/components/shared/meeting-transcript-panel";
import { EditableTitle } from "@/components/meetings/editable-title";
import { MeetingTypeSelector } from "@/components/meetings/meeting-type-selector";
import { PartyTypeSelector } from "@/components/meetings/party-type-selector";
import { PeopleSelector } from "@/components/meetings/people-selector";
import { ProjectLinker } from "@/components/meetings/project-linker";
import { CopyMeetingButton } from "@/components/meetings/copy-meeting-button";
import { PipelineInfo } from "@/components/shared/pipeline-info";
import { approveMeetingWithEditsAction, rejectMeetingAction } from "@/actions/review";
import { updateMeetingSummaryAction } from "@/features/meetings/actions";
import { RegenerateMenu } from "@/components/shared/regenerate-menu";
import { AlertTriangle, Mail, Tags } from "lucide-react";
import type { PersonForAssignment } from "@repo/database/queries/people";
import type { MeetingSegment } from "@repo/database/queries/meeting-project-summaries";
import { SegmentList } from "@/components/shared/segment-list";
import { ProposalsList, type ProposalItem } from "./proposals-list";

interface Extraction {
  id: string;
  type: string;
  content: string;
  confidence: number | null;
  transcript_ref: string | null;
  metadata: Record<string, unknown>;
  reasoning?: string | null;
}

interface ReviewDetailProps {
  meeting: {
    id: string;
    title: string | null;
    date: string | null;
    meeting_type: string | null;
    party_type: string | null;
    transcript: string | null;
    transcript_elevenlabs?: string | null;
    summary: string | null;
    raw_fireflies: Record<string, unknown> | null;
    organization_id: string | null;
    organization: { name: string } | null;
    meeting_participants: { person: { id: string; name: string } }[];
    meeting_projects: { project: { id: string; name: string } }[];
    extractions: Extraction[];
  };
  allPeople: {
    id: string;
    name: string;
    role: string | null;
    organization: { name: string } | null;
  }[];
  organizations: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  promotedExtractionIds?: string[];
  peopleForAssignment?: PersonForAssignment[];
  segments?: MeetingSegment[];
  /** TH-011 (UI-330) — emerging-theme-proposals waarvan origin_meeting_id = deze meeting. */
  proposedThemes?: ProposalItem[];
}

export function ReviewDetail({
  meeting,
  allPeople,
  organizations,
  projects,
  promotedExtractionIds,
  peopleForAssignment,
  segments,
  proposedThemes,
}: ReviewDetailProps) {
  const router = useRouter();
  const [edits, setEdits] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [summaryEdit, setSummaryEdit] = useState<string | null>(null);

  const handleSummaryEdit = useCallback(
    async (content: string) => {
      setSummaryEdit(content);
      const result = await updateMeetingSummaryAction({ meetingId: meeting.id, summary: content });
      if ("error" in result) {
        console.error("[handleSummaryEdit] Save failed:", result.error);
      }
    },
    [meeting.id],
  );

  const handleEdit = useCallback((id: string, content: string) => {
    setEdits((prev) => new Map(prev).set(id, content));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setDeletedIds((prev) => new Set(prev).add(id));
  }, []);

  async function handleApprove() {
    setLoading("approve");
    setError(null);
    const extractionEdits = Array.from(edits.entries()).map(([extractionId, content]) => ({
      extractionId,
      content,
    }));

    const rejectedExtractionIds = Array.from(deletedIds);

    const result = await approveMeetingWithEditsAction({
      meetingId: meeting.id,
      extractionEdits: extractionEdits.length > 0 ? extractionEdits : undefined,
      rejectedExtractionIds: rejectedExtractionIds.length > 0 ? rejectedExtractionIds : undefined,
      summaryEdit: summaryEdit ?? undefined,
    });

    if ("error" in result) {
      setError(result.error);
      setLoading(null);
      return;
    }
    router.push("/review");
  }

  async function handleReject(reason: string) {
    setLoading("reject");
    setError(null);

    const result = await rejectMeetingAction({
      meetingId: meeting.id,
      reason,
    });

    if ("error" in result) {
      setError(result.error);
      setLoading(null);
      return;
    }
    router.push("/review");
  }

  const actionItems = meeting.extractions.filter(
    (e) => e.type === "action_item" && !deletedIds.has(e.id),
  );
  const risks = meeting.extractions.filter((e) => e.type === "risk" && !deletedIds.has(e.id));
  const proposals = proposedThemes ?? [];
  const defaultTab = risks.length > 0 ? "risks" : "followups";
  const linkedPeople = meeting.meeting_participants.map((mp) => mp.person);
  const linkedProjects = meeting.meeting_projects.map((mp) => mp.project);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem-7rem)] flex-col lg:flex-row">
      <MeetingTranscriptPanel
        meeting={meeting}
        titleSlot={<EditableTitle meetingId={meeting.id} initialTitle={meeting.title} />}
        meetingTypeSlot={
          <div className="flex items-center gap-1.5">
            <MeetingTypeSelector meetingId={meeting.id} currentType={meeting.meeting_type} />
            <PartyTypeSelector meetingId={meeting.id} currentType={meeting.party_type} />
          </div>
        }
        participantsSlot={
          <PeopleSelector
            meetingId={meeting.id}
            linkedPeople={linkedPeople}
            allPeople={allPeople}
            organizations={organizations}
          />
        }
        headerExtra={
          <div className="mt-3">
            <ProjectLinker
              meetingId={meeting.id}
              linkedProjects={linkedProjects}
              allProjects={projects}
              organizations={organizations}
            />
          </div>
        }
        summaryAction={
          <div className="flex items-center gap-1.5">
            <PipelineInfo rawFireflies={meeting.raw_fireflies} />
            <CopyMeetingButton meeting={meeting} />
          </div>
        }
        onSummaryEdit={handleSummaryEdit}
      />

      {/* Right panel: Segments + Action Items (45%) */}
      <div className="flex-1 overflow-y-auto lg:w-[45%] lg:flex-none">
        {segments && segments.length > 0 && (
          <div className="border-b border-border/50 px-6 py-4">
            <SegmentList segments={segments} projects={projects} meetingId={meeting.id} />
          </div>
        )}

        <Tabs defaultValue={defaultTab}>
          <div className="sticky top-0 z-10 border-b border-border/50 bg-background/95 backdrop-blur-sm px-6 pt-4 pb-3">
            <div className="flex items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="risks">
                  <AlertTriangle className="mr-1.5 size-4 text-red-600" />
                  Risico&apos;s
                  <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                    {risks.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="followups">
                  <Mail className="mr-1.5 size-4 text-amber-500" />
                  Opvolgsuggesties
                  <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    {actionItems.length}
                  </span>
                </TabsTrigger>
                {proposals.length > 0 && (
                  <TabsTrigger value="proposals">
                    <Tags className="mr-1.5 size-4 text-violet-500" />
                    Voorgestelde thema&apos;s
                    <span className="ml-2 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                      {proposals.length}
                    </span>
                  </TabsTrigger>
                )}
              </TabsList>
              <RegenerateMenu meetingId={meeting.id} />
            </div>
          </div>

          <TabsContent value="risks" className="p-6 pb-24">
            <RiskList
              items={risks.map((r) => ({
                id: r.id,
                content: r.content,
                confidence: r.confidence,
                transcript_ref: r.transcript_ref,
                reasoning: r.reasoning ?? null,
                metadata: (r.metadata ?? null) as RiskItem["metadata"],
              }))}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </TabsContent>

          <TabsContent value="followups" className="p-6 pb-24">
            <FollowUpChecklist
              items={actionItems}
              promotedIds={promotedExtractionIds}
              people={peopleForAssignment}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </TabsContent>

          {proposals.length > 0 && (
            <TabsContent value="proposals" className="p-6 pb-24">
              <ProposalsList meetingId={meeting.id} proposals={proposals} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <ReviewActionBar
        totalExtractions={meeting.extractions.length}
        deletedCount={deletedIds.size}
        editCount={edits.size + (summaryEdit !== null ? 1 : 0)}
        onApprove={handleApprove}
        onReject={handleReject}
        loading={loading === "approve" ? "approve" : loading === "reject" ? "reject" : null}
        error={error}
      />
    </div>
  );
}
