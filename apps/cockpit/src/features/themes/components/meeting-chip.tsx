import Link from "next/link";

export interface MeetingChipProps {
  meetingId: string;
  /** ISO date of the meeting. Null renders without a date-prefix. */
  date: string | null;
  title: string | null;
  /** Verkort lange titels tot deze limiet (chars). Default 32. */
  maxTitleLength?: number;
}

/**
 * TH-014 (UI-404) — Inline chip voor bron-verwijzing naar een meeting in de
 * Theme-Narrator narrative. Klikbaar naar `/meetings/[id]`. Subtiel zodat de
 * leesflow van de prose niet breekt, maar herkenbaar genoeg om als citaat-
 * bron te dienen.
 *
 * Wordt niet gebruikt binnen AI-gerenderde markdown (agent schrijft datum +
 * titel inline als tekst, niet als chip-component). De chip-variant leeft
 * wel in de open-points lijst waar we handmatig referenties koppelen, of in
 * een latere iteratie waar een post-processor meeting-referenties in de
 * prose detect'eert en vervangt door chips.
 */
export function MeetingChip({ meetingId, date, title, maxTitleLength = 32 }: MeetingChipProps) {
  const dateLabel = formatDateShort(date);
  const titleLabel = truncate(title ?? "(geen titel)", maxTitleLength);
  return (
    <Link
      href={`/meetings/${meetingId}`}
      className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 align-baseline text-xs font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
    >
      {dateLabel !== null && (
        <>
          <span className="size-1 rounded-full bg-muted-foreground/60" aria-hidden="true" />
          <span className="text-muted-foreground">{dateLabel}</span>
          <span className="text-muted-foreground/40">·</span>
        </>
      )}
      <span>{titleLabel}</span>
    </Link>
  );
}

const MONTHS_NL = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

function formatDateShort(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCDate()} ${MONTHS_NL[d.getUTCMonth()]}`;
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit - 1).trimEnd() + "…";
}
