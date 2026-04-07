"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertTriangle,
  Layers,
  Trash2,
  ChevronDown,
  ChevronRight,
  Minus,
} from "lucide-react";
import { linkSegmentToProjectAction, removeSegmentTagAction } from "@/actions/segments";
import type { MeetingSegment } from "@repo/database/queries/meeting-project-summaries";

interface SegmentListProps {
  segments: MeetingSegment[];
  projects: { id: string; name: string }[];
  meetingId: string;
}

/** Render inline markdown: **bold** and "quotes" */
function renderInlineMarkdown(text: string) {
  const parts: (string | React.ReactElement)[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(remaining.slice(0, boldMatch.index));
      }
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {boldMatch[1]}
        </strong>,
      );
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
    } else {
      parts.push(remaining);
      break;
    }
  }

  return parts;
}

/** Max items to show as preview before "toon meer" */
const PREVIEW_ITEMS = 2;
/** Threshold: if Algemeen has more items than this, collapse by default */
const ALGEMEEN_COLLAPSE_THRESHOLD = 5;

export function SegmentList({ segments, projects, meetingId }: SegmentListProps) {
  if (segments.length === 0) return null;

  // Sort: project segments first, Algemeen last
  const projectSegments = segments.filter((s) => !s.is_general);
  const generalSegment = segments.find((s) => s.is_general);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Layers className="size-4 text-blue-600" />
        <h3 className="text-sm font-semibold">Project-segmenten</h3>
        <span className="rounded-full bg-blue-600/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
          {projectSegments.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {projectSegments.map((segment) => (
          <SegmentCard
            key={segment.id}
            segment={segment}
            projects={projects}
            meetingId={meetingId}
          />
        ))}

        {generalSegment && <GeneralSegmentRow segment={generalSegment} />}
      </div>
    </div>
  );
}

function SegmentCard({
  segment,
  projects,
  meetingId,
}: {
  segment: MeetingSegment;
  projects: { id: string; name: string }[];
  meetingId: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [linking, setLinking] = useState(false);
  const [removing, setRemoving] = useState(false);

  const isUnknown = !segment.project_id && segment.project_name_raw && !segment.is_general;
  const displayName = segment.project_name ?? segment.project_name_raw ?? "Onbekend";
  const totalItems = segment.kernpunten.length + segment.vervolgstappen.length;

  // Preview: first N kernpunten
  const previewItems = segment.kernpunten.slice(0, PREVIEW_ITEMS);
  const hasMore = totalItems > PREVIEW_ITEMS;

  async function handleLink(projectId: string) {
    setLinking(true);
    await linkSegmentToProjectAction({ segmentId: segment.id, projectId, meetingId });
    setLinking(false);
    router.refresh();
  }

  async function handleRemoveTag() {
    setRemoving(true);
    await removeSegmentTagAction({ segmentId: segment.id, meetingId });
    setRemoving(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card">
      {/* Clickable header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        {isUnknown ? (
          <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
        ) : (
          <CheckCircle2 className="size-3.5 shrink-0 text-green-600" />
        )}
        <span className="flex-1 text-sm font-medium">
          {isUnknown ? `"${displayName}"` : displayName}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {totalItems} {totalItems === 1 ? "punt" : "punten"}
        </span>
        {hasMore ? (
          expanded ? (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 text-muted-foreground" />
          )
        ) : null}
      </button>

      {/* Preview (always visible) */}
      {!expanded && previewItems.length > 0 && (
        <div className="border-t border-border/30 px-3 pb-2.5 pt-1.5">
          {previewItems.map((k, i) => (
            <p key={i} className="text-xs leading-relaxed text-foreground/70">
              {renderInlineMarkdown(k)}
            </p>
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-1 text-[11px] font-medium text-blue-600 hover:underline"
            >
              +{totalItems - PREVIEW_ITEMS} meer...
            </button>
          )}
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border/30 px-3 pb-3 pt-2">
          {segment.kernpunten.length > 0 && (
            <div className="mb-2 space-y-1.5">
              {segment.kernpunten.map((k, i) => (
                <p key={i} className="text-xs leading-relaxed text-foreground/80">
                  {renderInlineMarkdown(k)}
                </p>
              ))}
            </div>
          )}

          {segment.vervolgstappen.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Vervolgstappen
              </p>
              {segment.vervolgstappen.map((v, i) => (
                <p key={i} className="text-xs leading-relaxed text-foreground/70">
                  <span className="mr-1 text-muted-foreground">→</span>
                  {renderInlineMarkdown(v)}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {!segment.is_general && (
        <div className="flex items-center gap-2 border-t border-border/30 px-3 py-1.5">
          <select
            className="h-6 flex-1 rounded border border-border bg-background px-1.5 text-[11px] disabled:opacity-50"
            defaultValue=""
            disabled={linking}
            onChange={(e) => {
              if (e.target.value) handleLink(e.target.value);
            }}
          >
            <option value="" disabled>
              {segment.project_id ? "Herlink aan project..." : "Koppel aan project..."}
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleRemoveTag}
            disabled={removing}
            className="flex h-6 items-center gap-1 rounded border border-border px-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="size-2.5" />
            {removing ? "..." : "Verwijder"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Collapsed row for the "Algemeen" segment — not prominent, expandable */
function GeneralSegmentRow({ segment }: { segment: MeetingSegment }) {
  const totalItems = segment.kernpunten.length + segment.vervolgstappen.length;
  const [expanded, setExpanded] = useState(totalItems <= ALGEMEEN_COLLAPSE_THRESHOLD);

  if (totalItems === 0) return null;

  return (
    <div className="rounded-lg border border-border/30 bg-muted/30">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <Minus className="size-3 shrink-0 text-muted-foreground/60" />
        <span className="flex-1 text-xs text-muted-foreground">Algemeen</span>
        <span className="text-[11px] text-muted-foreground/60">
          {totalItems} {totalItems === 1 ? "punt" : "punten"}
        </span>
        {expanded ? (
          <ChevronDown className="size-3 text-muted-foreground/60" />
        ) : (
          <ChevronRight className="size-3 text-muted-foreground/60" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border/20 px-3 pb-2.5 pt-1.5">
          <div className="space-y-1">
            {segment.kernpunten.map((k, i) => (
              <p key={i} className="text-xs leading-relaxed text-muted-foreground">
                {renderInlineMarkdown(k)}
              </p>
            ))}
          </div>
          {segment.vervolgstappen.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                Vervolgstappen
              </p>
              {segment.vervolgstappen.map((v, i) => (
                <p key={i} className="text-xs leading-relaxed text-muted-foreground">
                  <span className="mr-1">→</span>
                  {renderInlineMarkdown(v)}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
