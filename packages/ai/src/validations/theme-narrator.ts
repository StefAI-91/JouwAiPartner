import { z } from "zod";

/**
 * TH-014 (AI-250) — Zod-schema voor Theme-Narrator output.
 *
 * De Theme-Narrator draait per thema over alle `meeting_themes.summary` rijen
 * (rijke per-meeting markdown uit TH-013) en synthetiseert die tot één lopende
 * thema-pagina. Output is zes prose-secties + een signaal-check.
 *
 * Secties zijn optioneel zodat de agent bij dun signaal mag skippen — bij 2-3
 * meetings is het eerlijker om bv. "Waar het schuurt" leeg te laten dan te
 * vullen met fluff. Verplicht: briefing, signal_strength, signal_notes. Dat
 * zijn de minima voor een bruikbare pagina.
 *
 * Geen maxItems/pattern in het schema — Anthropic's structured-output
 * accepteert die niet. Lengte-caps toepassen we post-validatie in de agent.
 */

export const ThemeNarratorOutputSchema = z.object({
  briefing: z
    .string()
    .min(1, "briefing mag niet leeg zijn")
    .describe(
      "Lede (2-3 zinnen): de essentie van wat er binnen dit thema speelt. Geen samenvatting van alle meetings — de kern. Wordt als serif-lede bovenaan de thema-pagina getoond.",
    ),
  patterns: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Wat komt terug over tijd? Wat is stabiel, wat evolueert, wat verschuift? Verwijs bij elke claim naar bron-meeting (datum + korte titel inline). Laat leeg wanneer de basis te dun is voor patronen.",
    ),
  alignment: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Waar zitten jullie op één lijn? Positief geframed, compact — bullet-list of korte prose. Focus op onderwerpen waar de founders/betrokkenen het duidelijk over eens zijn.",
    ),
  friction: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Waar zit onderliggende spanning, herhaalde discussie of onopgeloste ambiguïteit? Prose met bold leads, altijd met bron-meeting. Laat leeg bij geen signaal.",
    ),
  open_points: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Concrete beslissingen, vragen of acties die nog hangen — met meeting-verwijzing waar ze ontstonden. Lijst-format. Laat leeg als alles afgerond of niets traceerbaar.",
    ),
  blind_spots: z
    .string()
    .nullable()
    .optional()
    .describe(
      "De meest waardevolle sectie: iets wat de lezers zelf waarschijnlijk niet zien omdat ze erin zitten. Onuitgesproken aanname, drift, terugkerend patroon, of tegenstrijdigheid tussen meetings. Eerlijk, confronterend, concreet. Laat leeg bij echt te dun signaal.",
    ),
  signal_strength: z
    .enum(["sterk", "matig", "zwak"])
    .describe(
      "Agent-zelfoordeel over de kwaliteit van het synthese-signaal. 'sterk' = consistent thema over ≥3 meetings met duidelijke evolutie; 'matig' = bruikbaar maar smal; 'zwak' = randje hallucinatie-gevaar.",
    ),
  signal_notes: z
    .string()
    .min(1, "signal_notes mag niet leeg zijn")
    .describe(
      "1-2 zinnen: wat mist in de input om dit écht nuttig te maken? (bv. 'geen zichtbaarheid op externe afstemming', 'te weinig citaten uit betrokkenen'). Voedt later eventuele pipeline-verbeteringen.",
    ),
});

export type ThemeNarratorOutput = z.infer<typeof ThemeNarratorOutputSchema>;

/** Totaal-output cap: alle prose-secties samen ≤ 10.000 chars. Voorkomt runaway. */
export const NARRATIVE_TOTAL_CHAR_CAP = 10_000;
