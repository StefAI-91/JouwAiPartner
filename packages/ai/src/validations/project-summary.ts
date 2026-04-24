import { z } from "zod";

export const TimelineEntrySchema = z.object({
  date: z.string().describe("Datum in YYYY-MM-DD formaat."),
  source_type: z
    .enum(["meeting", "email"])
    .default("meeting")
    .describe(
      "Of deze entry van een meeting of een email afkomstig is. " +
        "Default 'meeting' voor backwards-compatibility met oudere timeline-data " +
        "die nog géén source_type bevatte.",
    ),
  meeting_type: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Type meeting (discovery, team_sync, status_update, sales, etc.) " +
        "wanneer source_type='meeting'. Null/weglaten voor emails.",
    ),
  title: z.string().describe("Titel van de meeting of het email-onderwerp."),
  summary: z
    .string()
    .describe(
      "Eén zin die beschrijft WAT er gebeurde in deze meeting of email. " +
        "Géén besluiten of acties herhalen — die staan in key_decisions / open_actions.",
    ),
  key_decisions: z
    .array(z.string())
    .describe(
      "Concrete besluiten genomen in deze meeting/email. " +
        "Niet herhalen wat al in summary of open_actions staat. " +
        "Leeg als er geen besluiten waren.",
    ),
  open_actions: z
    .array(z.string())
    .describe(
      "Actiepunten die in deze meeting/email zijn benoemd. " +
        "Pure extract uit de bron — geen oordeel of ze inmiddels zijn afgerond " +
        "(die status leeft elders). Niet herhalen wat al in summary of key_decisions staat. " +
        "Leeg als er geen acties werden benoemd.",
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
      "Chronologisch overzicht van alle meetings én relevante emails door elkaar, " +
        "van oud naar nieuw. Per entry: datum, source_type (meeting of email), " +
        "meeting_type (alleen voor meetings), titel, samenvatting in één zin, " +
        "key_decisions en open_actions. Dit toont het projectverloop: hoe bouwt het " +
        "project op, waar kantelde het, welke besluiten leidden tot veranderingen.",
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

/**
 * Veilig `TimelineEntry[]` extraheren uit een project-`structured_content`
 * JSON-blob. Zelfde patroon als `extractOrgTimeline`.
 *
 * Bestaande timeline-data van vóór de email-uitbreiding bevat geen
 * `source_type`-veld; de schema-default ('meeting') vangt dat op zodat
 * de UI niet leeg blijft tot de eerstvolgende regeneratie.
 */
export function extractProjectTimeline(
  structuredContent: Record<string, unknown> | null | undefined,
): TimelineEntry[] {
  if (!structuredContent || typeof structuredContent !== "object") return [];
  const raw = (structuredContent as { timeline?: unknown }).timeline;
  if (!Array.isArray(raw)) return [];
  const parsed = z.array(TimelineEntrySchema).safeParse(raw);
  return parsed.success ? parsed.data : [];
}
