"use client";

import { useState } from "react";
import Link from "next/link";
import { MeetingTypeBadge } from "@/components/shared/meeting-type-badge";
import { ConfidenceBar } from "@/components/shared/confidence-bar";
import { getMeetingHref } from "@/lib/meeting-href";
import type { ProjectSegment } from "@repo/database/queries/meeting-project-summaries";

interface Meeting {
  id: string;
  title: string | null;
  date: string | null;
  meeting_type: string | null;
  verification_status: string;
}

interface Email {
  id: string;
  subject: string | null;
  from_name: string | null;
  from_address: string;
  date: string;
  snippet: string | null;
  email_type: string | null;
  party_type: string | null;
  verification_status: string;
}

interface Extraction {
  id: string;
  type: string;
  content: string;
  confidence: number | null;
  transcript_ref: string | null;
  metadata: Record<string, unknown>;
  meeting: { id: string; title: string | null } | null;
}

interface EmailExtraction {
  id: string;
  type: string;
  content: string;
  confidence: number | null;
  source_ref: string | null;
  metadata: Record<string, unknown>;
  email: { id: string; subject: string | null } | null;
}

const TABS = [
  "segments",
  "meetings",
  "emails",
  "action_items",
  "decisions",
  "needs_insights",
] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  segments: "Segmenten",
  meetings: "Meetings",
  emails: "Emails",
  action_items: "Action Items",
  decisions: "Decisions",
  needs_insights: "Needs & Insights",
};

interface ProjectSectionsProps {
  meetings: Meeting[];
  emails: Email[];
  extractions: Extraction[];
  emailExtractions: EmailExtraction[];
  segments?: ProjectSegment[];
}

export function ProjectSections({
  meetings,
  emails,
  extractions,
  emailExtractions,
  segments = [],
}: ProjectSectionsProps) {
  const [activeTab, setActiveTab] = useState<Tab>(segments.length > 0 ? "segments" : "meetings");

  // Combine meeting extractions and email extractions for the tabs
  const allActionItems = [
    ...extractions.filter((e) => e.type === "action_item"),
    ...emailExtractions.filter((e) => e.type === "action_item"),
  ];
  const allDecisions = [
    ...extractions.filter((e) => e.type === "decision"),
    ...emailExtractions.filter((e) => e.type === "decision"),
  ];
  const allNeedsInsights = [
    ...extractions.filter((e) => e.type === "need" || e.type === "insight"),
    ...emailExtractions.filter((e) => e.type === "need" || e.type === "insight"),
  ];

  const counts: Record<Tab, number> = {
    segments: segments.length,
    meetings: meetings.length,
    emails: emails.length,
    action_items: allActionItems.length,
    decisions: allDecisions.length,
    needs_insights: allNeedsInsights.length,
  };

  // Only show tabs that have content (always show meetings)
  const visibleTabs = TABS.filter((tab) => {
    if (tab === "meetings") return true;
    return counts[tab] > 0;
  });

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border/50 pb-px">
        {visibleTabs.map((tab) => (
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

      {/* Tab content */}
      <div className="pt-6">
        {activeTab === "segments" && <SegmentsSection segments={segments} />}
        {activeTab === "meetings" && <MeetingsSection meetings={meetings} />}
        {activeTab === "emails" && <EmailsSection emails={emails} />}
        {activeTab === "action_items" && (
          <CombinedExtractionsSection items={allActionItems} type="action_item" />
        )}
        {activeTab === "decisions" && (
          <CombinedExtractionsSection items={allDecisions} type="decision" />
        )}
        {activeTab === "needs_insights" && (
          <CombinedExtractionsSection items={allNeedsInsights} type="needs_insights" />
        )}
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
        No meetings linked to this project
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
              <h4 className="text-sm font-semibold">{meeting.title ?? "Untitled meeting"}</h4>
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

const EMAIL_TYPE_LABELS: Record<string, string> = {
  project_communication: "Project",
  sales: "Sales",
  internal: "Intern",
  administrative: "Admin",
  legal_finance: "Juridisch/Financieel",
  newsletter: "Nieuwsbrief",
  notification: "Notificatie",
  other: "Overig",
};

function EmailsSection({ emails }: { emails: Email[] }) {
  if (emails.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Geen emails gekoppeld aan dit project
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {emails.map((email) => (
        <Link
          key={email.id}
          href={
            email.verification_status === "draft"
              ? `/review/email/${email.id}`
              : `/emails/${email.id}`
          }
          className="block rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-semibold">
                {email.subject ?? "(geen onderwerp)"}
              </h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Van: {email.from_name ?? email.from_address}
              </p>
              {email.date && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(email.date).toLocaleDateString("nl-NL", {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {email.email_type && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                  {EMAIL_TYPE_LABELS[email.email_type] ?? email.email_type}
                </span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  email.verification_status === "verified"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {email.verification_status}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

const TYPE_COLORS: Record<string, { border: string }> = {
  action_item: { border: "#16A34A" },
  decision: { border: "#3B82F6" },
  need: { border: "#A855F7" },
  insight: { border: "#6B7280" },
};

type CombinedItem = (Extraction | EmailExtraction) & {
  _source_label?: string;
};

function CombinedExtractionsSection({ items, type }: { items: CombinedItem[]; type: string }) {
  if (items.length === 0) {
    const labels: Record<string, string> = {
      action_item: "Geen actiepunten gevonden",
      decision: "Geen besluiten gevonden",
      needs_insights: "Geen behoeften of inzichten gevonden",
    };
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {labels[type] ?? "Geen items gevonden"}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const color = TYPE_COLORS[item.type] ?? TYPE_COLORS.insight;
        // Determine source label
        const isMeetingExtraction = "meeting" in item && "transcript_ref" in item;
        const sourceLabel = isMeetingExtraction
          ? (item as Extraction).meeting?.title
          : (item as EmailExtraction).email?.subject;

        return (
          <div
            key={item.id}
            className="rounded-xl bg-white p-4 shadow-sm"
            style={{ borderLeft: `3px solid ${color.border}` }}
          >
            <p className="text-sm leading-relaxed">{item.content}</p>

            {item.type === "action_item" && item.metadata && (
              <ActionItemMeta metadata={item.metadata} />
            )}

            {"transcript_ref" in item && item.transcript_ref && (
              <blockquote className="mt-2 border-l-2 border-muted pl-3 text-xs italic text-muted-foreground">
                {item.transcript_ref}
              </blockquote>
            )}

            {"source_ref" in item && item.source_ref && (
              <blockquote className="mt-2 border-l-2 border-muted pl-3 text-xs italic text-muted-foreground">
                {item.source_ref}
              </blockquote>
            )}

            <div className="mt-2 flex items-center justify-between">
              <ConfidenceBar confidence={item.confidence} />
              <div className="flex items-center gap-1.5">
                {!isMeetingExtraction && (
                  <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-600">
                    email
                  </span>
                )}
                {sourceLabel && (
                  <span className="text-[10px] text-muted-foreground">{sourceLabel}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExtractionsSection({ items, type }: { items: Extraction[]; type: string }) {
  if (items.length === 0) {
    const labels: Record<string, string> = {
      action_item: "No action items found",
      decision: "No decisions found",
      needs_insights: "No needs or insights found",
    };
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {labels[type] ?? "No items found"}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const color = TYPE_COLORS[item.type] ?? TYPE_COLORS.insight;
        return (
          <div
            key={item.id}
            className="rounded-xl bg-white p-4 shadow-sm"
            style={{ borderLeft: `3px solid ${color.border}` }}
          >
            <p className="text-sm leading-relaxed">{item.content}</p>

            {/* Action item metadata */}
            {item.type === "action_item" && item.metadata && (
              <ActionItemMeta metadata={item.metadata} />
            )}

            {item.transcript_ref && (
              <blockquote className="mt-2 border-l-2 border-muted pl-3 text-xs italic text-muted-foreground">
                {item.transcript_ref}
              </blockquote>
            )}

            <div className="mt-2 flex items-center justify-between">
              <ConfidenceBar confidence={item.confidence} />
              {item.meeting && (
                <span className="text-[10px] text-muted-foreground">
                  {item.meeting.title ?? "Untitled"}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActionItemMeta({ metadata }: { metadata: Record<string, unknown> }) {
  const assignee = metadata.assignee ? String(metadata.assignee) : null;
  const dueDate = metadata.due_date ? String(metadata.due_date) : null;
  const status = metadata.status ? String(metadata.status) : null;

  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
      {assignee && <span className="rounded-full bg-muted px-2 py-0.5">{assignee}</span>}
      {dueDate && <span className="rounded-full bg-muted px-2 py-0.5">Due: {dueDate}</span>}
      {status && (
        <span
          className={`rounded-full px-2 py-0.5 ${
            status === "done" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {status}
        </span>
      )}
    </div>
  );
}
