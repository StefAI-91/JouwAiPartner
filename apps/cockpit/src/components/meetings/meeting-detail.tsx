import { ExtractionCard } from "@/components/review/extraction-card";
import { VerificationBadge } from "@/components/shared/verification-badge";
import { MeetingTranscriptPanel } from "@/components/shared/meeting-transcript-panel";
import { EXTRACTION_TYPE_ORDER, EXTRACTION_TYPE_LABELS } from "@/components/shared/extraction-constants";
import { EditableTitle } from "@/components/meetings/editable-title";
import { MeetingTypeSelector } from "@/components/meetings/meeting-type-selector";
import { PeopleSelector } from "@/components/meetings/people-selector";
import { ProjectLinker } from "@/components/meetings/project-linker";
import type { MeetingDetail } from "@repo/database/queries/meetings";
import type { PersonWithOrg, PersonForAssignment } from "@repo/database/queries/people";

interface MeetingDetailViewProps {
  meeting: MeetingDetail;
  allPeople: PersonWithOrg[];
  organizations: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  promotedExtractionIds?: Set<string>;
  peopleForAssignment?: PersonForAssignment[];
}

export function MeetingDetailView({
  meeting,
  allPeople,
  organizations,
  projects,
  promotedExtractionIds,
  peopleForAssignment,
}: MeetingDetailViewProps) {
  const grouped = new Map<string, MeetingDetail["extractions"]>();
  for (const ext of meeting.extractions) {
    const list = grouped.get(ext.type) ?? [];
    list.push(ext);
    grouped.set(ext.type, list);
  }

  const linkedProjects = meeting.meeting_projects.map((mp) => mp.project);
  const linkedPeople = meeting.meeting_participants.map((mp) => mp.person);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem-7rem)] flex-col lg:flex-row">
      <MeetingTranscriptPanel
        meeting={meeting}
        titleSlot={
          <EditableTitle meetingId={meeting.id} initialTitle={meeting.title} />
        }
        meetingTypeSlot={
          <MeetingTypeSelector meetingId={meeting.id} currentType={meeting.meeting_type} />
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
          <div className="mt-3 space-y-3">
            <VerificationBadge
              verifierName={meeting.verifier?.full_name ?? null}
              verifiedAt={meeting.verified_at}
            />
            <ProjectLinker
              meetingId={meeting.id}
              linkedProjects={linkedProjects}
              allProjects={projects}
              organizations={organizations}
            />
          </div>
        }
      />

      {/* Right panel: Extractions (45%) */}
      <div className="flex-1 overflow-y-auto p-6 lg:w-[45%] lg:flex-none">
        <h2 className="mb-4">Extracties</h2>
        {meeting.extractions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen extracties</p>
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
                      <ExtractionCard
                        key={ext.id}
                        extraction={ext}
                        readOnly
                        showPromote
                        isPromoted={promotedExtractionIds?.has(ext.id)}
                        people={peopleForAssignment}
                      />
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
