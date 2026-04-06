"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle, Layers, Trash2 } from "lucide-react";
import { linkSegmentToProjectAction, removeSegmentTagAction } from "@/actions/segments";
import type { MeetingSegment } from "@repo/database/queries/meeting-project-summaries";

interface SegmentListProps {
  segments: MeetingSegment[];
  projects: { id: string; name: string }[];
  meetingId: string;
}

export function SegmentList({ segments, projects, meetingId }: SegmentListProps) {
  if (segments.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="size-4 text-blue-600" />
        <h3 className="text-sm font-semibold">Project-segmenten</h3>
        <span className="rounded-full bg-blue-600/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
          {segments.length}
        </span>
      </div>
      <div className="space-y-2">
        {segments.map((segment) => (
          <SegmentCard
            key={segment.id}
            segment={segment}
            projects={projects}
            meetingId={meetingId}
          />
        ))}
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
  const [linking, setLinking] = useState(false);
  const [removing, setRemoving] = useState(false);

  const isUnknown = !segment.project_id && segment.project_name_raw && !segment.is_general;
  const displayName = segment.project_name ?? segment.project_name_raw ?? "Algemeen";
  const totalItems = segment.kernpunten.length + segment.vervolgstappen.length;

  async function handleLink(projectId: string) {
    setLinking(true);
    const result = await linkSegmentToProjectAction({
      segmentId: segment.id,
      projectId,
      meetingId,
    });
    if ("error" in result) {
      console.error("Link failed:", result.error);
    }
    setLinking(false);
    router.refresh();
  }

  async function handleRemoveTag() {
    setRemoving(true);
    const result = await removeSegmentTagAction({
      segmentId: segment.id,
      meetingId,
    });
    if ("error" in result) {
      console.error("Remove failed:", result.error);
    }
    setRemoving(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card p-3">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        {isUnknown ? (
          <AlertTriangle className="size-4 shrink-0 text-amber-500" />
        ) : (
          <CheckCircle2 className="size-4 shrink-0 text-green-600" />
        )}
        <span className="text-sm font-medium">{isUnknown ? `"${displayName}"` : displayName}</span>
        <span className="text-xs text-muted-foreground">
          ({totalItems} {totalItems === 1 ? "item" : "items"})
        </span>
      </div>

      {/* Kernpunten */}
      {segment.kernpunten.length > 0 && (
        <div className="mb-1.5">
          <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Kernpunten
          </p>
          <ul className="space-y-0.5">
            {segment.kernpunten.map((k, i) => (
              <li key={i} className="text-xs leading-relaxed text-foreground/80">
                <span className="mr-1 text-muted-foreground">•</span>
                {k}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Vervolgstappen */}
      {segment.vervolgstappen.length > 0 && (
        <div className="mb-1.5">
          <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Vervolgstappen
          </p>
          <ul className="space-y-0.5">
            {segment.vervolgstappen.map((v, i) => (
              <li key={i} className="text-xs leading-relaxed text-foreground/80">
                <span className="mr-1 text-muted-foreground">→</span>
                {v}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions for unknown segments */}
      {isUnknown && (
        <div className="mt-2 flex items-center gap-2 border-t border-border/30 pt-2">
          <select
            className="h-7 flex-1 rounded border border-border bg-background px-2 text-xs disabled:opacity-50"
            defaultValue=""
            disabled={linking}
            onChange={(e) => {
              if (e.target.value) handleLink(e.target.value);
            }}
          >
            <option value="" disabled>
              Koppel aan project...
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
            className="flex h-7 items-center gap-1 rounded border border-border px-2 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="size-3" />
            {removing ? "..." : "Verwijder tag"}
          </button>
        </div>
      )}
    </div>
  );
}
