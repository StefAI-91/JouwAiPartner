"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Pencil, Trash2, User } from "lucide-react";
import {
  RISK_CATEGORY_LABELS,
  RISK_IMPACT_AREA_LABELS,
  RISK_SEVERITY_BADGES,
} from "@/components/shared/extraction-constants";

export interface RiskItem {
  id: string;
  content: string;
  confidence: number | null;
  transcript_ref: string | null;
  reasoning?: string | null;
  metadata?: {
    severity?: string;
    category?: string;
    jaip_impact_area?: string;
    raised_by?: string;
    theme?: string;
  } | null;
}

interface RiskListProps {
  items: RiskItem[];
  /** Edit-callback; afwezig = read-only. */
  onEdit?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
}

/**
 * Rendert risk-extracties gesorteerd op severity (critical → high → medium
 * → low → unknown). Per item:
 *   - severity-badge (rood/oranje/amber/grijs via RISK_SEVERITY_BADGES)
 *   - category + impact_area badges (losse chips, secundair)
 *   - raised_by chip (wie deed de uitspraak)
 *   - uitklapbare reasoning + source_quote (transcript_ref)
 *   - edit/delete knoppen wanneer callbacks zijn meegegeven
 */
export function RiskList({ items, onEdit, onDelete }: RiskListProps) {
  const sorted = [...items].sort((a, b) => {
    const rankA = RISK_SEVERITY_BADGES[a.metadata?.severity ?? ""]?.rank ?? 99;
    const rankB = RISK_SEVERITY_BADGES[b.metadata?.severity ?? ""]?.rank ?? 99;
    return rankA - rankB;
  });

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Geen risico&apos;s geëxtraheerd voor deze meeting.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {sorted.map((risk) => (
        <RiskRow key={risk.id} risk={risk} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </ul>
  );
}

interface RiskRowProps {
  risk: RiskItem;
  onEdit?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
}

function RiskRow({ risk, onEdit, onDelete }: RiskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(risk.content);

  const severity = risk.metadata?.severity ?? null;
  const severityBadge = severity ? RISK_SEVERITY_BADGES[severity] : null;
  const category = risk.metadata?.category ?? null;
  const impactArea = risk.metadata?.jaip_impact_area ?? null;
  const raisedBy = risk.metadata?.raised_by ?? null;
  const hasDetails =
    Boolean(risk.reasoning) ||
    Boolean(risk.transcript_ref) ||
    Boolean(category) ||
    Boolean(impactArea);

  function handleSave() {
    setEditing(false);
    if (content !== risk.content && onEdit) onEdit(risk.id, content);
  }

  return (
    <li
      className="group/risk rounded-xl bg-card p-4 shadow-sm"
      style={{ borderLeft: `3px solid ${severityBadge?.color ?? "#525252"}` }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <AlertTriangle
            className="size-3.5"
            style={{ color: severityBadge?.color ?? "#525252" }}
          />
          {severityBadge && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: severityBadge.color, backgroundColor: severityBadge.bg }}
            >
              {severityBadge.label}
            </span>
          )}
          {category && RISK_CATEGORY_LABELS[category] && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {RISK_CATEGORY_LABELS[category]}
            </span>
          )}
          {impactArea && RISK_IMPACT_AREA_LABELS[impactArea] && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Impact: {RISK_IMPACT_AREA_LABELS[impactArea]}
            </span>
          )}
        </div>

        {(onEdit || onDelete) && !editing && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/risk:opacity-100">
            {onEdit && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Bewerken"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(risk.id)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                title="Verwijderen"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            className="w-full resize-none rounded-md border border-border bg-background p-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setContent(risk.content);
              }}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              Annuleer
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background hover:opacity-90"
            >
              Opslaan
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-snug text-foreground">{risk.content}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        {raisedBy && (
          <span className="flex items-center gap-1">
            <User className="size-3" />
            {raisedBy}
          </span>
        )}
        {typeof risk.confidence === "number" && (
          <span>Confidence: {(risk.confidence * 100).toFixed(0)}%</span>
        )}
        {hasDetails && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="ml-auto flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            {expanded ? "Verberg details" : "Toon details"}
          </button>
        )}
      </div>

      {expanded && hasDetails && (
        <div className="mt-3 space-y-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          {risk.reasoning && (
            <div>
              <div className="mb-0.5 font-semibold text-foreground">Reasoning</div>
              <p>{risk.reasoning}</p>
            </div>
          )}
          {risk.transcript_ref && (
            <div>
              <div className="mb-0.5 font-semibold text-foreground">Source quote</div>
              <p className="italic">&quot;{risk.transcript_ref}&quot;</p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
