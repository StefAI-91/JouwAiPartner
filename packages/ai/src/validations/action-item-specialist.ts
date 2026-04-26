import { z } from "zod";

/**
 * Action Item Specialist v1 — extractie-only schema.
 *
 * Geen lane-classificatie in deze versie (post-processing-step). Wel
 * type_werk en category, want die zijn observable uit het transcript en
 * vereisen LLM-context (intern/extern, partner-relatie).
 *
 * Sentinels conform Risk Specialist patroon:
 *   - "" voor onbekende string-velden (downstream → null)
 *   - "n/a" voor onbekende enums (downstream → null)
 * Alle velden REQUIRED in raw schema voor strict Anthropic structured output.
 */
export const ActionItemSpecialistRawItemSchema = z.object({
  content: z
    .string()
    .describe(
      "NL zin, max 30 woorden, beginnend met naam van follow_up_contact. Bijv: 'Jan navragen of vragenlijst voor Booktalk V2 retour is gekomen'.",
    ),
  follow_up_contact: z
    .string()
    .describe(
      "Naam van persoon die we kunnen mailen/aanspreken om dit op te volgen. Verplicht — geen item zonder contact. Gebruik exacte naam uit participants.",
    ),
  assignee: z
    .string()
    .describe(
      "Wie de actie uitvoert. Mag verschillen van follow_up_contact. Lege string als zelfde als follow_up_contact.",
    ),
  source_quote: z
    .string()
    .describe(
      "Letterlijk uit transcript, max 200 chars. Lege string als geen letterlijke quote te isoleren is (dan ook confidence 0.0).",
    ),
  project_context: z
    .string()
    .describe(
      "Project waar dit aan hangt. Bijv 'Booktalk V2', 'Sandra-prospect', 'JAIP-propositie'. Lege string als geen specifiek project.",
    ),
  deadline: z
    .string()
    .describe(
      "ISO YYYY-MM-DD. Lege string als geen deadline-cue benoemd is (NIET een fake default invullen).",
    ),
  follow_up_date: z
    .string()
    .describe(
      "ISO YYYY-MM-DD. Wanneer JAIP intern moet pingen of extern moet opvolgen. ALLEEN invullen als deadline leeg is én er een aparte ping-cue in transcript staat ('stuur me over een week reminder', 'ping me eind volgende maand'). Bij gevulde deadline → laat dit leeg, code leidt het deterministisch af. Bij geen ping-cue → leeg laten.",
    ),
  type_werk: z
    .enum(["A", "B", "C", "D"])
    .describe(
      "A=intern JAIP, B=JAIP levert aan extern, C=extern levert aan JAIP, D=beslissing afwachten. Tibor en Dion zijn gewone externen — hun leveringen aan JAIP vallen onder C.",
    ),
  category: z
    .enum(["wachten_op_extern", "wachten_op_beslissing", "n/a"])
    .describe(
      "wachten_op_extern voor type_werk C. wachten_op_beslissing voor type_werk D. n/a voor intern werk (A/B).",
    ),
  confidence: z
    .number()
    .describe(
      "0.4-1.0. Geen 0.0-0.4 — bij twijfel niet extraheren. 0.0 alleen als source_quote leeg.",
    ),
  reasoning: z
    .string()
    .describe(
      "1-2 korte NL zinnen: welke eis (rol/toezegging/concreet/agency) het sterkst hit, welk type_werk en waarom, eventuele twijfelpunten. Wordt in tuning-UI getoond zodat false positives terug te vertalen zijn naar prompt-fixes.",
    ),
  recipient_per_quote: z
    .enum(["stef_wouter", "third_party", "own_sphere", "from_jaip", "unclear"])
    .describe(
      "Wie is volgens de quote zelf de ontvanger van de levering? stef_wouter = JAIP-medewerker. third_party = andere externe (bv. Tibor → klant). own_sphere = eigen kring van de externe (eigen team, eigen panel, eigen klanten, eigen tooling). from_jaip = JAIP is uitvoerder (type A/B). unclear = niet eenduidig uit quote af te leiden. Voor type_werk C of D MOET dit 'stef_wouter' zijn — anders auto-reject.",
    ),
  jaip_followup_quote: z
    .string()
    .describe(
      "Letterlijke zin uit transcript waar Stef of Wouter zelf hun eigen vervolgstap uitspreken (eerste persoon: 'dan ga ik X', 'ik wacht hierop omdat ik Y') of waar de spreker hen direct aanspreekt ('als jij dat hebt, dan kun jij Z'). Lege string als geen citaat te vinden. Voor type_werk C of D MOET deze gevuld zijn — anders auto-reject. Voor type A/B mag leeg.",
    ),
  jaip_followup_action: z
    .enum(["productive", "consumptive", "n/a"])
    .describe(
      "Wat doet JAIP in de vervolgstap die in jaip_followup_quote staat? productive = JAIP produceert iets eigens (offerte schrijven, document maken, mail sturen, beslissing nemen, feedback formuleren, correcties geven). consumptive = JAIP consumeert/luistert/sluit aan zonder eigen output (langskomen, bijwonen, mee-luisteren, kijken naar wat externen hebben uitgewerkt). n/a = geen JAIP-vervolgstap (type A puur intern of geen action). Voor type_werk C of D MOET dit 'productive' zijn — anders auto-reject. Een 'kom-luisteren'-vervolgstap rechtvaardigt geen type C; dan is het externen-overleg met JAIP als toehoorder.",
    ),
});

export const ActionItemSpecialistRawOutputSchema = z.object({
  items: z.array(ActionItemSpecialistRawItemSchema),
});

export type RawActionItemSpecialistOutput = z.infer<typeof ActionItemSpecialistRawOutputSchema>;

export type ActionItemRecipientPerQuote =
  | "stef_wouter"
  | "third_party"
  | "own_sphere"
  | "from_jaip"
  | "unclear";

export type ActionItemFollowupAction = "productive" | "consumptive" | "n/a";

export type ActionItemSpecialistItem = {
  content: string;
  follow_up_contact: string;
  assignee: string | null;
  source_quote: string | null;
  project_context: string | null;
  deadline: string | null;
  follow_up_date: string | null;
  type_werk: "A" | "B" | "C" | "D";
  category: "wachten_op_extern" | "wachten_op_beslissing" | null;
  confidence: number;
  reasoning: string | null;
  recipient_per_quote: ActionItemRecipientPerQuote;
  jaip_followup_quote: string | null;
  jaip_followup_action: ActionItemFollowupAction;
};

export type ActionItemSpecialistOutput = {
  items: ActionItemSpecialistItem[];
};
