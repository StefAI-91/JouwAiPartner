"use client";

import { ExtractionCard } from "@/components/review/extraction-card";
import { MeetingTypeBadge } from "@/components/shared/meeting-type-badge";
import { VerificationBadge } from "@/components/shared/verification-badge";
import type { MeetingDetail } from "@repo/database/queries/meetings";

const TYPE_ORDER = ["decision", "action_item", "need", "insight"];
const TYPE_LABELS: Record<string, string> = {
  decision: "Decisions",
  action_item: "Action Items",
  need: "Needs",
  insight: "Insights",
};

export function MeetingDetailView({ meeting }: { meeting: MeetingDetail }) {
  const grouped = new Map<string, MeetingDetail["extractions"]>();
  for (const ext of meeting.extractions) {
    const list = grouped.get(ext.type) ?? [];
    list.push(ext);
    grouped.set(ext.type, list);
  }

  const transcriptRefs = new Set(
    meeting.extractions
      .map((e) => e.transcript_ref)
      .filter((ref): ref is string => ref !== null && ref.length > 0),
  );

  function highlightTranscript(text: string): React.ReactNode[] {
    if (transcriptRefs.size === 0) return [text];

    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    for (const ref of transcriptRefs) {
      const idx = remaining.indexOf(ref);
      if (idx !== -1) {
        if (idx > 0) parts.push(remaining.slice(0, idx));
        parts.push(
          <mark key={key++} className="rounded bg-yellow-100/50 px-0.5">
            {ref}
          </mark>,
        );
        remaining = remaining.slice(idx + ref.length);
      }
    }
    if (remaining) parts.push(remaining);
    return parts;
  }

  const participants = meeting.meeting_participants.map((mp) => mp.person.name);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem-7rem)] flex-col lg:flex-row">
      {/* Left panel: Transcript (55%) */}
      <div className="flex-1 overflow-y-auto border-r border-border/50 p-6 lg:w-[55%] lg:flex-none">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {meeting.organization && (
              <span className="font-medium text-foreground/70">{meeting.organization.name}</span>
            )}
            <MeetingTypeBadge type={meeting.meeting_type} />
            {meeting.party_type && <span>{meeting.party_type}</span>}
          </div>
          <h1 className="mt-2">{meeting.title ?? "Untitled meeting"}</h1>
          {meeting.date && (
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(meeting.date).toLocaleDateString("en-GB", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
          <div className="mt-3">
            <VerificationBadge
              verifierName={meeting.verifier?.full_name ?? null}
              verifiedAt={meeting.verified_at}
            />
          </div>
        </div>

        {participants.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {participants.map((name) => (
              <span key={name} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {name}
              </span>
            ))}
          </div>
        )}

        {meeting.summary && (
          <div className="mb-6 rounded-xl bg-muted/50 p-4">
            <h3 className="mb-2 text-sm font-semibold">Summary</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{meeting.summary}</p>
          </div>
        )}

        {meeting.transcript ? (
          <div className="prose prose-sm max-w-none">
            <h3 className="mb-3 text-sm font-semibold">Transcript</h3>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
              {highlightTranscript(meeting.transcript)}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No transcript available</p>
        )}
      </div>

      {/* Right panel: Extractions (45%) */}
      <div className="flex-1 overflow-y-auto p-6 lg:w-[45%] lg:flex-none">
        <h2 className="mb-4">Extractions</h2>
        {meeting.extractions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No extractions</p>
        ) : (
          <div className="space-y-6">
            {TYPE_ORDER.map((type) => {
              const items = grouped.get(type);
              if (!items || items.length === 0) return null;
              return (
                <div key={type}>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {TYPE_LABELS[type]} ({items.length})
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
