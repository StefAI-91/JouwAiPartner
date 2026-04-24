"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatDate } from "@repo/ui/format";
import { Badge } from "@repo/ui/badge";
import type { ThemeMeetingEntry } from "@repo/database/queries/themes";
import { MatchRejectPopover } from "@/features/themes/components/match-reject-popover";

/**
 * TH-013 (UI-340 + EDGE-243 + EDGE-244) — Collapsible markdown-renderer voor
 * per-thema samenvatting. Sinds TH-013 bevat `meeting_themes.summary` een
 * rijke markdown-string (## Briefing / ## Kernpunten / ## Vervolgstappen).
 * Pre-TH-013 rijen bevatten 1-2 zins plain-text van de Theme-Detector —
 * markdown is een superset van plain text, dus zelfde renderer werkt voor
 * beide (EDGE-244). Collapsible bij > COLLAPSE_THRESHOLD via `<details>`.
 * react-markdown rendert zonder `dangerouslySetInnerHTML` → XSS-veilig
 * (EDGE-243).
 */
const COLLAPSE_THRESHOLD = 400;

const MARKDOWN_PROSE_CLASSES = [
  "prose prose-sm max-w-none text-foreground",
  "[&_h2]:text-[12px] [&_h2]:font-semibold [&_h2]:uppercase [&_h2]:tracking-wider [&_h2]:text-muted-foreground [&_h2]:mt-3 [&_h2]:mb-1 first:[&_h2]:mt-0",
  "[&_ul]:my-1 [&_ul]:pl-4 [&_ul]:space-y-0.5",
  "[&_li]:text-[13px] [&_li]:leading-snug [&_li]:marker:text-muted-foreground/40",
  "[&_p]:text-[13px] [&_p]:leading-snug [&_p]:my-1",
  "[&_strong]:text-foreground",
].join(" ");

function ThemeSummaryBlock({ markdown }: { markdown: string }) {
  const isLong = markdown.length > COLLAPSE_THRESHOLD;
  const content = (
    <div className={MARKDOWN_PROSE_CLASSES}>
      <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
    </div>
  );

  if (!isLong) {
    return <div className="mt-2">{content}</div>;
  }

  return (
    <details className="group mt-2 cursor-pointer">
      <summary className="list-none text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground">
        <span className="group-open:hidden">Toon samenvatting</span>
        <span className="hidden group-open:inline">Verberg samenvatting</span>
      </summary>
      <div className="mt-2">{content}</div>
    </details>
  );
}

export interface MeetingsTabProps {
  themeId: string;
  themeName: string;
  meetings: ThemeMeetingEntry[];
  canRejectMatches: boolean;
}

/**
 * UI-272 + UI-297..299 + TH-011 UI-332: Meetings-tab. Sectie-gebaseerd
 * gegroepeerd op `meetings.party_type` in drie blokken: **Wij intern**
 * (internal) · **Klanten** (external) · **Gemengd** (mixed). Lege secties
 * krijgen geen header. Binnen elke sectie: nieuwste eerst (sortering van
 * `getThemeMeetings`). Onbekende party_type (null) landt in een
 * "Overig"-sectie om geen data te verliezen; hoort normaal niet voor te
 * komen op verified meetings.
 *
 * Per rij: titel + datum + participants + confidence-badge, `<details>`
 * uitklapper met letterlijke evidence-quote. Admins zien ⊘-icoon
 * (MatchRejectPopover) om een verkeerde koppeling af te wijzen. Na
 * rejection vervagen we de rij lokaal en triggeren een refresh.
 */
export function MeetingsTab({ themeId, themeName, meetings, canRejectMatches }: MeetingsTabProps) {
  const router = useRouter();
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());

  if (meetings.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 text-[13px] text-muted-foreground">
        Nog geen meetings gekoppeld aan dit thema.
      </p>
    );
  }

  const sections: { key: string; title: string; meetings: ThemeMeetingEntry[] }[] = [
    {
      key: "internal",
      title: "Wij intern",
      meetings: meetings.filter((m) => m.party_type === "internal"),
    },
    {
      key: "external",
      title: "Klanten",
      meetings: meetings.filter((m) => m.party_type === "external"),
    },
    {
      key: "mixed",
      title: "Gemengd",
      meetings: meetings.filter((m) => m.party_type === "mixed"),
    },
    {
      key: "unknown",
      title: "Overig",
      meetings: meetings.filter((m) => m.party_type === null),
    },
  ].filter((s) => s.meetings.length > 0);

  const renderMeeting = (m: ThemeMeetingEntry) => {
    const isRejected = rejectedIds.has(m.meeting_id);
    return (
      <li
        key={m.meeting_id}
        className={`rounded-xl border border-border/60 bg-card p-4 transition-opacity ${isRejected ? "opacity-40" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1">
            <Link
              href={`/meetings/${m.meeting_id}`}
              className="text-[14px] font-semibold text-foreground hover:text-primary hover:underline"
            >
              {m.title ?? "(meeting zonder titel)"}
            </Link>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span>{formatDate(m.date)}</span>
              {m.participants && m.participants.length > 0 && (
                <span className="truncate">
                  {m.participants.slice(0, 4).join(", ")}
                  {m.participants.length > 4 && ` +${m.participants.length - 4}`}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={m.confidence === "high" ? "default" : "secondary"}>
              {m.confidence}
            </Badge>
            {canRejectMatches && !isRejected && (
              <MatchRejectPopover
                meetingId={m.meeting_id}
                themeId={themeId}
                themeName={themeName}
                onRejected={() => {
                  setRejectedIds((prev) => {
                    const next = new Set(prev);
                    next.add(m.meeting_id);
                    return next;
                  });
                  router.refresh();
                }}
              />
            )}
          </div>
        </div>
        {m.summary && <ThemeSummaryBlock markdown={m.summary} />}
        <details className="mt-2 cursor-pointer text-[12.5px]">
          <summary className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
            Evidence
          </summary>
          <blockquote className="mt-2 border-l-2 border-primary/30 pl-3 text-muted-foreground italic">
            &ldquo;{m.evidence_quote}&rdquo;
          </blockquote>
        </details>
        {m.extractions.length > 0 && (
          <ul className="mt-3 space-y-1 text-[12.5px] leading-snug">
            {m.extractions.map((ex) => (
              <li key={ex.id} className="flex gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground shrink-0">
                  {ex.type}:
                </span>
                <span className="text-foreground">{ex.content}</span>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.key}>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
            <span className="ml-2 font-normal text-muted-foreground/70">
              ({section.meetings.length})
            </span>
          </h3>
          <ul className="space-y-2">{section.meetings.map(renderMeeting)}</ul>
        </section>
      ))}
    </div>
  );
}
