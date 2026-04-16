"use client";

import { useState, useCallback } from "react";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { MeetingTranscriptPanel } from "@/components/shared/meeting-transcript-panel";
import { ExtractionTabsPanel } from "@/components/meetings/extraction-tabs-panel";
import { CopyMeetingButton } from "@/components/meetings/copy-meeting-button";
import { EditMetadataModal } from "@/components/meetings/edit-metadata-modal";
import { PipelineInfo } from "@/components/shared/pipeline-info";
import { Button } from "@repo/ui/button";
import { Pencil, FolderKanban, RefreshCw } from "lucide-react";
import { updateMeetingSummaryAction, regenerateMeetingTitleAction } from "@/actions/meetings";
import type { MeetingDetail } from "@repo/database/queries/meetings";
import type { PersonWithOrg, PersonForAssignment } from "@repo/database/queries/people";
import type { MeetingSegment } from "@repo/database/queries/meeting-project-summaries";
import { SegmentList } from "@/components/shared/segment-list";

interface MeetingDetailViewProps {
  meeting: MeetingDetail;
  allPeople: PersonWithOrg[];
  organizations: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  promotedExtractionIds?: string[];
  peopleForAssignment?: PersonForAssignment[];
  segments?: MeetingSegment[];
}

export function MeetingDetailView({
  meeting,
  allPeople,
  organizations,
  projects,
  promotedExtractionIds,
  peopleForAssignment,
  segments,
}: MeetingDetailViewProps) {
  const linkedProjects = meeting.meeting_projects.map((mp) => mp.project);
  const linkedPeople = meeting.meeting_participants.map((mp) => mp.person);
  const [showEditModal, setShowEditModal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(meeting.title);
  const [titleError, setTitleError] = useState<string | null>(null);

  const handleRegenerateTitle = useCallback(async () => {
    setRegenerating(true);
    setTitleError(null);
    try {
      const result = await regenerateMeetingTitleAction({ meetingId: meeting.id });
      if ("error" in result) {
        console.error("[handleRegenerateTitle]", result.error);
        setTitleError(result.error);
      } else {
        setCurrentTitle(result.title);
      }
    } finally {
      setRegenerating(false);
    }
  }, [meeting.id]);

  const handleSummaryEdit = useCallback(
    async (content: string) => {
      const result = await updateMeetingSummaryAction({ meetingId: meeting.id, summary: content });
      if ("error" in result) {
        console.error("[handleSummaryEdit] Save failed:", result.error);
      }
    },
    [meeting.id],
  );

  return (
    <div className="flex min-h-[calc(100vh-3.5rem-7rem)] flex-col lg:flex-row">
      <MeetingTranscriptPanel
        meeting={{ ...meeting, title: currentTitle }}
        summaryAction={
          <div className="flex items-center gap-1.5">
            <PipelineInfo rawFireflies={meeting.raw_fireflies} />
            <CopyMeetingButton meeting={meeting} />
          </div>
        }
        onSummaryEdit={handleSummaryEdit}
        headerExtra={
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2">
              <VerificationBadge
                verifierName={meeting.verifier?.full_name ?? null}
                verifiedAt={meeting.verified_at}
              />
              <Button size="xs" variant="outline" onClick={() => setShowEditModal(true)}>
                <Pencil className="size-3" data-icon="inline-start" />
                Metadata bewerken
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={handleRegenerateTitle}
                disabled={regenerating}
              >
                <RefreshCw
                  className={`size-3 ${regenerating ? "animate-spin" : ""}`}
                  data-icon="inline-start"
                />
                {regenerating ? "Genereren..." : "Titel regenereren"}
              </Button>
            </div>
            {titleError && <p className="text-xs text-destructive">{titleError}</p>}

            {/* Static project display */}
            {linkedProjects.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <FolderKanban className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Projecten
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {linkedProjects.map((project) => (
                    <span
                      key={project.id}
                      className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
                    >
                      {project.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Original Fireflies title */}
            {meeting.original_title && meeting.original_title !== currentTitle && (
              <p className="text-xs text-muted-foreground">
                Originele titel: {meeting.original_title}
              </p>
            )}

            {/* Static organization display */}
            {meeting.organization && (
              <p className="text-xs text-muted-foreground">
                Organisatie: {meeting.organization.name}
              </p>
            )}
          </div>
        }
      />

      {/* Right panel: Segments + Extractions (45%) */}
      <div className="flex-1 overflow-y-auto lg:w-[45%] lg:flex-none">
        {segments && segments.length > 0 && (
          <div className="border-b border-border/50 p-6">
            <SegmentList segments={segments} projects={projects} meetingId={meeting.id} />
          </div>
        )}
        <ExtractionTabsPanel
          extractions={meeting.extractions}
          promotedExtractionIds={promotedExtractionIds}
          peopleForAssignment={peopleForAssignment}
          meetingId={meeting.id}
          editable
        />
      </div>

      <EditMetadataModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        meeting={{
          id: meeting.id,
          title: meeting.title,
          meeting_type: meeting.meeting_type,
          party_type: meeting.party_type,
          organization_id: meeting.organization_id,
        }}
        linkedProjects={linkedProjects}
        linkedPeople={linkedPeople}
        allPeople={allPeople}
        allProjects={projects}
        organizations={organizations}
      />
    </div>
  );
}
