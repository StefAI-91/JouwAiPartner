import Link from "next/link";
import { formatDate } from "@repo/ui/format";
import type { ThemeDecisionEntry } from "@repo/database/queries/themes";

export interface DecisionsTabProps {
  decisions: ThemeDecisionEntry[];
}

/**
 * UI-273: Besluiten-tab. Alle `type='decision'` extractions uit meetings
 * die aan dit thema gekoppeld zijn, desc op datum.
 */
export function DecisionsTab({ decisions }: DecisionsTabProps) {
  if (decisions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 text-[13px] text-muted-foreground">
        Nog geen besluiten uit meetings die aan dit thema gekoppeld zijn.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {decisions.map((d) => (
        <li key={d.extraction_id} className="rounded-xl border border-border/60 bg-card p-4">
          <p className="text-[14px] text-foreground">{d.content}</p>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
            <Link href={`/meetings/${d.meeting_id}`} className="hover:text-primary hover:underline">
              {d.meeting_title ?? "(meeting)"}
            </Link>
            <span>·</span>
            <span>{formatDate(d.meeting_date ?? d.created_at)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
