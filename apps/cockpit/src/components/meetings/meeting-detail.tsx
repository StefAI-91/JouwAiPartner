"use client";

import { ExtractionCard } from "@/components/review/extraction-card";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { MeetingTranscriptPanel } from "@/components/shared/meeting-transcript-panel";
import { EXTRACTION_TYPE_ORDER, EXTRACTION_TYPE_LABELS } from "@/components/shared/extraction-constants";
import {
  EditableTitle,
  OrganizationSelector,
  ProjectLinker,
} from "@/components/meetings/meeting-management";
import type { MeetingDetail } from "@repo/database/queries/meetings";

interface MeetingDetailViewProps {
  meeting: MeetingDetail;
  organizations: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}

export function MeetingDetailView({ meeting, organizations, projects }: MeetingDetailViewProps) {
  const grouped = new Map<string, MeetingDetail["extractions"]>();
  for (const ext of meeting.extractions) {
    const list = grouped.get(ext.type) ?? [];
    list.push(ext);
    grouped.set(ext.type, list);
  }

  const linkedProjects = meeting.meeting_projects.map((mp) => mp.project);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem-7rem)] flex-col lg:flex-row">
      <MeetingTranscriptPanel
        meeting={meeting}
        titleSlot={
          <EditableTitle meetingId={meeting.id} initialTitle={meeting.title} />
        }
        organizationSlot={
          <OrganizationSelector
            meetingId={meeting.id}
            currentOrgId={meeting.organization_id}
            currentOrgName={meeting.organization?.name ?? null}
            organizations={organizations}
          />
        }
        headerExtra={
          <div className="mt-3 space-y-3">
            <VerificationBadge
              verifierName={meeting.verifier?.full_name ?? null}
              verifiedAt={meeting.verified_at}
            />
            <ProjectLinker
              meetingId={meeting.id}
              linkedProjects={linkedProjects}
              allProjects={projects}
            />
          </div>
        }
      />

      {/* Right panel: Extractions (45%) */}
      <div className="flex-1 overflow-y-auto p-6 lg:w-[45%] lg:flex-none">
        <h2 className="mb-4">Extractions</h2>
        {meeting.extractions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No extractions</p>
        ) : (
          <div className="space-y-6">
            {EXTRACTION_TYPE_ORDER.map((type) => {
              const items = grouped.get(type);
              if (!items || items.length === 0) return null;
              return (
                <div key={type}>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {EXTRACTION_TYPE_LABELS[type]} ({items.length})
                  </h3>
                  <div className="space-y-3">
                    {items.map((ext) => (
                      <ExtractionCard key={ext.id} extraction={ext} readOnly />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
