import Link from "next/link";
import type { ThemeParticipantEntry } from "@repo/database/queries/themes";

export interface PeopleTabProps {
  participants: ThemeParticipantEntry[];
}

/**
 * UI-275: Mensen-tab. Unieke participants uit de meetings die aan dit thema
 * gekoppeld zijn, met mention-count. Klikbaar naar `/people/[id]`.
 */
export function PeopleTab({ participants }: PeopleTabProps) {
  if (participants.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 text-[13px] text-muted-foreground">
        Nog geen gekoppelde meetings, dus ook geen deelnemers.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
      {participants.map((p) => (
        <li key={p.person_id}>
          <Link
            href={`/people/${p.person_id}`}
            className="flex items-center justify-between px-4 py-3 text-[13px] hover:bg-muted/30"
          >
            <span className="font-medium text-foreground">{p.name}</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {p.meeting_count} meeting{p.meeting_count === 1 ? "" : "s"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
