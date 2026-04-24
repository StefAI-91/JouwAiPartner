import { ConfidenceBar } from "@/components/shared/confidence-bar";

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

export type CombinedItem = Extraction | EmailExtraction;

const TYPE_COLORS: Record<string, { border: string }> = {
  action_item: { border: "#16A34A" },
  decision: { border: "#3B82F6" },
  need: { border: "#A855F7" },
  insight: { border: "#6B7280" },
};

export function CombinedExtractionsSection({
  items,
  type,
}: {
  items: CombinedItem[];
  type: string;
}) {
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
