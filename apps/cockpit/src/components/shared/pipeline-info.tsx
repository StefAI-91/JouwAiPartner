"use client";

import { useState } from "react";
import { Info, X, Check, AlertTriangle, Minus } from "lucide-react";

interface PipelineStep {
  name: string;
  status: "success" | "warning" | "skipped";
  details?: string;
}

function parsePipelineSteps(rawFireflies: Record<string, unknown> | null): PipelineStep[] {
  if (!rawFireflies) return [];

  const pipeline = rawFireflies.pipeline as Record<string, unknown> | undefined;
  if (!pipeline) return [];

  const steps: PipelineStep[] = [];

  // 1. Processed at
  const processedAt = pipeline.processed_at as string | undefined;
  if (processedAt) {
    const date = new Date(processedAt);
    steps.push({
      name: "Verwerkt",
      status: "success",
      details: date.toLocaleString("nl-NL", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }

  // 2. Participant classification
  const participants = pipeline.participant_classification as
    | { raw: string; label: string; matched_name?: string }[]
    | undefined;
  if (participants) {
    const matched = participants.filter((p) => p.label !== "unknown").length;
    const total = participants.length;
    steps.push({
      name: "Deelnemers geclassificeerd",
      status: matched > 0 ? "success" : "warning",
      details: `${matched}/${total} herkend`,
    });
  }

  // 3. Party type source
  const partyTypeSource = pipeline.party_type_source as string | undefined;
  if (partyTypeSource) {
    steps.push({
      name: "Party type",
      status: partyTypeSource === "deterministic" ? "success" : "warning",
      details:
        partyTypeSource === "deterministic"
          ? "Deterministisch (uit deelnemers)"
          : "Gatekeeper fallback",
    });
  }

  // 4. Gatekeeper
  const gatekeeper = pipeline.gatekeeper as Record<string, unknown> | undefined;
  if (gatekeeper) {
    const score = gatekeeper.relevance_score as number | undefined;
    const meetingType = gatekeeper.meeting_type as string | undefined;
    const reason = gatekeeper.reason as string | undefined;
    steps.push({
      name: "Gatekeeper classificatie",
      status: "success",
      details: [
        meetingType && `Type: ${meetingType}`,
        score != null && `Relevantie: ${(score * 100).toFixed(0)}%`,
        reason,
      ]
        .filter(Boolean)
        .join(" — "),
    });
  }

  // 5. Extractor
  const extractor = pipeline.extractor as Record<string, unknown> | undefined;
  if (extractor) {
    const count = extractor.extractions_count as number | undefined;
    const source = extractor.transcript_source as string | undefined;
    steps.push({
      name: "Extractor",
      status: "success",
      details: [count != null && `${count} extracties`, source && `Bron: ${source}`]
        .filter(Boolean)
        .join(" — "),
    });
  }

  // 6. Speaker map (check if speaker info is in pipeline)
  const speakerMap = pipeline.speaker_map as Record<string, unknown>[] | undefined;
  if (speakerMap) {
    const matched = speakerMap.filter((s) => s.person_id).length;
    steps.push({
      name: "Speaker mapping",
      status: matched > 0 ? "success" : "warning",
      details: `${matched}/${speakerMap.length} gekoppeld aan personen`,
    });
  }

  return steps;
}

const statusIcon = {
  success: <Check className="size-3.5 text-emerald-600" />,
  warning: <AlertTriangle className="size-3.5 text-amber-500" />,
  skipped: <Minus className="size-3.5 text-muted-foreground" />,
};

interface PipelineInfoProps {
  rawFireflies: Record<string, unknown> | null;
}

export function PipelineInfo({ rawFireflies }: PipelineInfoProps) {
  const [open, setOpen] = useState(false);
  const steps = parsePipelineSteps(rawFireflies);

  if (steps.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title="Pipeline info"
      >
        <Info className="size-3.5" />
        Pipeline
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-border bg-background shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-xs font-semibold">Pipeline Audit Trail</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-0.5 hover:bg-muted"
              >
                <X className="size-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-2 rounded-md px-2 py-1.5">
                  <div className="mt-0.5 shrink-0">{statusIcon[step.status]}</div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium">{step.name}</div>
                    {step.details && (
                      <div className="text-[11px] text-muted-foreground break-words">
                        {step.details}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
