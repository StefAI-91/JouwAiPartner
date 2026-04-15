import { z } from "zod";

export const TimelineEntrySchema = z.object({
  date: z.string().describe("Datum van de meeting in YYYY-MM-DD formaat."),
  meeting_type: z
    .string()
    .describe("Type meeting, bijv. discovery, team_sync, status_update, sales, etc."),
  title: z.string().describe("Titel van de meeting."),
  summary: z
    .string()
    .describe(
      "Eén zin die beschrijft wat er besproken/besloten is in deze meeting. " +
        "Focus op het belangrijkste resultaat of de belangrijkste uitkomst.",
    ),
  key_decisions: z
    .array(z.string())
    .describe("Concrete besluiten genomen in deze meeting. Leeg als er geen besluiten waren."),
  open_actions: z
    .array(z.string())
    .describe(
      "Actiepunten die uit deze meeting voortkwamen en nog niet zijn afgerond. " +
        "Leeg als er geen openstaande acties zijn.",
    ),
});

export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

export const ProjectSummaryOutputSchema = z.object({
  context: z
    .string()
    .describe(
      "Neutrale projectbeschrijving in 4-5 zinnen voor iemand die het project niet kent. " +
        "Wat is het project, wie is de klant, welke aanpak/technologie, scope, wie werkt eraan, " +
        "wanneer moet het af. Geen meningen, geen risico's, puur feitelijk.",
    ),
  briefing: z
    .string()
    .describe(
      "Forward-looking analyse in 4-5 zinnen. Voortgang vs deadline, openstaande actiepunten, " +
        "risico's en blokkades, en wat het team nu zou moeten doen. " +
        "Wees direct en actiegericht. Noem concrete namen, datums en items.",
    ),
  timeline: z
    .array(TimelineEntrySchema)
    .describe(
      "Chronologisch overzicht van alle meetings, van oud naar nieuw. " +
        "Per meeting: datum, type, titel, samenvatting in één zin, key decisions en open actions. " +
        "Dit toont het projectverloop: hoe bouwt het project op, waar kantelde het, " +
        "welke besluiten leidden tot veranderingen.",
    ),
});

export type ProjectSummaryOutput = z.infer<typeof ProjectSummaryOutputSchema>;

export const OrgTimelineEntrySchema = z.object({
  date: z.string().describe("Datum in YYYY-MM-DD formaat."),
  source_type: z
    .enum(["meeting", "email"])
    .describe("Of deze entry van een meeting of een email afkomstig is."),
  title: z.string().describe("Titel van de meeting of het email-onderwerp. Kort en herkenbaar."),
  summary: z
    .string()
    .describe(
      "Eén zin die beschrijft wat er gebeurde of besproken is. " +
        "Focus op het belangrijkste resultaat of de belangrijkste uitkomst.",
    ),
  key_decisions: z
    .array(z.string())
    .describe("Concrete besluiten uit deze meeting/email. Leeg als er geen besluiten waren."),
  open_actions: z
    .array(z.string())
    .describe(
      "Actiepunten die uit deze meeting/email voortkwamen en nog niet zijn afgerond. " +
        "Leeg als er geen openstaande acties zijn.",
    ),
});

export type OrgTimelineEntry = z.infer<typeof OrgTimelineEntrySchema>;

export const OrgSummaryOutputSchema = z.object({
  context: z
    .string()
    .describe(
      "Neutrale organisatiebeschrijving in 3-4 zinnen. Wie is de klant, wat voor bedrijf, " +
        "relatie met ons, lopende projecten, contactpersoon. Puur feitelijk.",
    ),
  briefing: z
    .string()
    .describe(
      "Klant-analyse in 3-4 zinnen. Voor organisaties ZONDER gekoppelde projecten: " +
        "focus op relatie — klant-sentiment, communicatiefrequentie, openstaande vragen, " +
        "trust-indicatoren, aandachtspunten in de relatie. " +
        "Voor organisaties MET gekoppelde projecten: focus overkoepelend — status over " +
        "alle projecten heen, cross-project risico's, klant-sentiment. Altijd actiegericht.",
    ),
  timeline: z
    .array(OrgTimelineEntrySchema)
    .describe(
      "Chronologisch overzicht van alle meetings én relevante emails door elkaar, " +
        "van oud naar nieuw. Per entry: datum, source_type (meeting of email), titel, " +
        "samenvatting in één zin, key_decisions en open_actions. Dit toont hoe de relatie " +
        "zich ontwikkelt over tijd, ongeacht of de touchpoint een meeting of email was.",
    ),
});

export type OrgSummaryOutput = z.infer<typeof OrgSummaryOutputSchema>;

/**
 * Veilig `OrgTimelineEntry[]` extraheren uit een `structured_content` JSON-blob.
 *
 * Het veld komt uit de DB als `Record<string, unknown> | null` en kan corrupt
 * zijn (bijv. oude versies, handmatige migraties, onbekende source_types).
 * Deze helper parse't met Zod en geeft een lege array terug als de inhoud
 * niet klopt — zodat een corrupte briefing nooit een runtime-crash
 * veroorzaakt in de UI.
 */
export function extractOrgTimeline(
  structuredContent: Record<string, unknown> | null | undefined,
): OrgTimelineEntry[] {
  if (!structuredContent || typeof structuredContent !== "object") return [];
  const raw = (structuredContent as { timeline?: unknown }).timeline;
  if (!Array.isArray(raw)) return [];
  const parsed = z.array(OrgTimelineEntrySchema).safeParse(raw);
  return parsed.success ? parsed.data : [];
}
