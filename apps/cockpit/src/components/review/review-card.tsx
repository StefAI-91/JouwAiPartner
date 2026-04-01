"use client";

import Link from "next/link";
import { MeetingTypeBadge } from "@/components/shared/meeting-type-badge";
import { ExtractionDots } from "@/components/shared/extraction-dots";
import { approveMeetingAction } from "@/actions/review";
import { useState } from "react";
import { timeAgo } from "@/lib/format";

interface ReviewCardProps {
  meeting: {
    id: string;
    title: string | null;
    date: string | null;
    meeting_type: string | null;
    party_type: string | null;
    created_at: string;
    organization: { name: string } | null;
    meeting_participants: { person: { id: string; name: string } }[];
    extractions: { id: string; type: string; content: string; confidence: number | null }[];
  };
}

export function ReviewCard({ meeting }: ReviewCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove(e: React.MouseEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await approveMeetingAction({ meetingId: meeting.id });
    if ("error" in result) {
      setError(result.error);
      setLoading(false);
    }
  }

  const participants = meeting.meeting_participants.map((mp) => mp.person.name).join(", ");

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      {/* Top row: meta + time ago */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {meeting.organization && (
            <span className="font-medium text-foreground/70">{meeting.organization.name}</span>
          )}
          <MeetingTypeBadge type={meeting.meeting_type} />
          {meeting.party_type && (
            <span className="text-muted-foreground">{meeting.party_type}</span>
          )}
        </div>
        <span>{timeAgo(meeting.date ?? meeting.created_at)}</span>
      </div>

      {/* Title */}
      <h3 className="mt-3 font-heading text-lg font-semibold leading-snug">
        {meeting.title ?? "Untitled meeting"}
      </h3>

      {/* Participants */}
      {participants && <p className="mt-1 text-sm text-muted-foreground">{participants}</p>}

      {/* Extraction dots */}
      <div className="mt-4">
        <ExtractionDots extractions={meeting.extractions} />
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex items-center justify-end gap-2">
        <Link
          href={`/review/${meeting.id}`}
          className="rounded-full border-2 border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-primary hover:text-primary"
        >
          Review
        </Link>
        <button
          onClick={handleApprove}
          disabled={loading}
          className="rounded-full bg-gradient-to-b from-brand to-brand-dark px-5 py-2 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {loading ? "Approving..." : "Approve"}
        </button>
      </div>
    </div>
  );
}
