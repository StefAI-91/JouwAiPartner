/**
 * Follow-up date resolver voor Action Item Specialist.
 *
 * Bepaalt `follow_up_date` deterministisch zodra `deadline` bekend is, anders
 * valt-ie terug op wat de AI uit transcript-cues heeft kunnen halen.
 *
 * Regels (zie stand-van-zaken):
 *  - type A   → follow_up = deadline
 *  - type B/C/D → follow_up = deadline − 1 werkdag
 *  - Floor: follow_up MOET > meetingdatum. Anders bumpt naar deadline + 1 werkdag
 *    (same-day en korte-termijn-deadlines: dag erna checken of het gebeurd is).
 *  - Geen deadline → gebruik AI-extracted follow_up_date (mits ISO + > meetingdatum), anders:
 *    voor type C een fallback van meetingdatum + TYPE_C_FALLBACK_WORKDAYS werkdagen
 *    (consultancy-cadans: één werkweek "geef ze ruimte"). Voor andere types null —
 *    daar weet JAIP de eigen agency en hoeft het systeem geen default op te leggen.
 *
 * Werkdag-rekenkunde skipt zaterdag (6) en zondag (0). Geen feestdagen.
 */

/** Default opvolgvenster voor type C zonder deadline-cue. Bewust een
 *  hele werkweek: korter geeft prematuur porren, langer laat het wegzakken. */
export const TYPE_C_FALLBACK_WORKDAYS = 5;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(iso: string): Date | null {
  if (!ISO_DATE_RE.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export function addWorkdays(iso: string, n: number): string | null {
  const date = parseIsoDate(iso);
  if (!date) return null;
  const step = n >= 0 ? 1 : -1;
  let remaining = Math.abs(n);
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + step);
    if (!isWeekend(date)) remaining -= 1;
  }
  return toIsoDate(date);
}

export interface ResolveFollowUpInput {
  deadline: string | null;
  aiFollowUp: string | null;
  typeWerk: "A" | "B" | "C" | "D";
  meetingDate: string;
}

/**
 * Bepaalt de uiteindelijke follow_up_date voor een item.
 *
 * Returns null als geen zinvolle datum afgeleid kan worden (geen deadline +
 * geen AI-cue, of een ongeldige input).
 */
export function resolveFollowUpDate(input: ResolveFollowUpInput): string | null {
  const meetingDate = parseIsoDate(input.meetingDate);
  if (!meetingDate) return null;

  if (input.deadline) {
    const deadline = parseIsoDate(input.deadline);
    if (!deadline) return null;

    const preferred = input.typeWerk === "A" ? input.deadline : addWorkdays(input.deadline, -1);
    if (!preferred) return null;

    const preferredDate = parseIsoDate(preferred);
    if (!preferredDate) return null;

    if (preferredDate.getTime() <= meetingDate.getTime()) {
      return addWorkdays(input.deadline, 1);
    }
    return preferred;
  }

  if (input.aiFollowUp) {
    const ai = parseIsoDate(input.aiFollowUp);
    if (!ai) return null;
    if (ai.getTime() <= meetingDate.getTime()) return null;
    return input.aiFollowUp;
  }

  // Fallback: type C zonder deadline en zonder ping-cue → meeting + N werkdagen.
  // Andere types blijven null — daar heeft JAIP eigen agency.
  if (input.typeWerk === "C") {
    return addWorkdays(input.meetingDate, TYPE_C_FALLBACK_WORKDAYS);
  }

  return null;
}
