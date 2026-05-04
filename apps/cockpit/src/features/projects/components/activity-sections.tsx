"use client";

import { useState } from "react";
import Link from "next/link";
import { MeetingTypeBadge } from "@/components/shared/meeting-type-badge";
import { getMeetingHref } from "@/lib/meeting-href";
import { EmailsSection, type ProjectEmail } from "./project-emails-section";
import type { ProjectSegment } from "@repo/database/queries/meetings/project-summaries";

interface Meeting {
  id: string;
  title: string | null;
  date: string | null;
  meeting_type: string | null;
  verification_status: string;
}

const TABS = ["segments", "meetings", "emails"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  segments: "Segmenten",
  meetings: "Meetings",
  emails: "Emails",
};

interface ActivitySectionsProps {
  meetings: Meeting[];
  emails: ProjectEmail[];
  segments: ProjectSegment[];
}

export function ActivitySections({ meetings, emails, segments }: ActivitySectionsProps) {
  const counts: Record<Tab, number> = {
    segments: segments.length,
    meetings: meetings.length,
    emails: emails.length,
  };

  const [activeTab, setActiveTab] = useState<Tab>(segments.length > 0 ? "segments" : "meetings");

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
        {activeTab === "segments" && <SegmentsSection segments={segments} />}
        {activeTab === "meetings" && <MeetingsSection meetings={meetings} />}
        {activeTab === "emails" && <EmailsSection emails={emails} />}
      </div>
    </div>
  );
}

function SegmentsSection({ segments }: { segments: ProjectSegment[] }) {
  if (segments.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Geen segmenten gevonden voor dit project
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {segments.map((segment) => {
        const dateStr = segment.meeting_date
          ? new Date(segment.meeting_date).toLocaleDateString("nl-NL", {
              weekday: "short",
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : null;

        return (
          <div key={segment.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <Link
                href={getMeetingHref(segment.meeting_id, "verified")}
                className="text-sm font-semibold text-foreground hover:text-[#006B3F] hover:underline"
              >
                {segment.meeting_title ?? "Naamloze meeting"}
              </Link>
              {dateStr && <span className="text-xs text-muted-foreground">{dateStr}</span>}
            </div>

            {segment.kernpunten.length > 0 && (
              <div className="mb-2">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Kernpunten
                </p>
                <ul className="space-y-1">
                  {segment.kernpunten.map((k, i) => (
                    <li key={i} className="text-sm leading-relaxed text-foreground/80">
                      <span className="mr-1.5 text-muted-foreground">•</span>
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {segment.vervolgstappen.length > 0 && (
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Vervolgstappen
                </p>
                <ul className="space-y-1">
                  {segment.vervolgstappen.map((v, i) => (
                    <li key={i} className="text-sm leading-relaxed text-foreground/80">
                      <span className="mr-1.5 text-muted-foreground">→</span>
                      {v}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MeetingsSection({ meetings }: { meetings: Meeting[] }) {
  if (meetings.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Geen meetings gekoppeld aan dit project
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {meetings.map((meeting) => (
        <Link
          key={meeting.id}
          href={getMeetingHref(meeting.id, meeting.verification_status)}
          className="block rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">{meeting.title ?? "Naamloze meeting"}</h4>
              {meeting.date && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(meeting.date).toLocaleDateString("nl-NL", {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <MeetingTypeBadge type={meeting.meeting_type} />
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  meeting.verification_status === "verified"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {meeting.verification_status}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
