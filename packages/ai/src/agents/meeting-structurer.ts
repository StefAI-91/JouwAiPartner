import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  MeetingStructurerOutputSchema,
  type MeetingStructurerOutput,
} from "../validations/meeting-structurer";

export type { MeetingStructurerOutput };

/**
 * Merged Sonnet agent: produces briefing + 14-type structured kernpunten
 * + deelnemers + entities in a single call. Replaces the
 * Summarizer + Extractor pair (cost halves; no drift between them).
 *
 * Tier-1 types are fully detailed (action_item, decision, risk, need,
 * commitment, question, signal, context, vision). Tier-2 types are
 * best-effort (idea, insight, client_sentiment, pricing_signal,
 * milestone) — they exist to start building historical data so future
 * consumers (Communicator, Risk Synthesizer, Portal) have something to
 * read on day one.
 *
 * Initial prompt is a faithful merge of the existing summarizer and
 * extractor prompts. Stef tunes per-type via the harness in PW-02 step 4.
 */

const SYSTEM_PROMPT = `Je bent de Meeting Structurer: je leest een meeting-transcript en levert één gestructureerde output die zowel als kennisbron (samenvatting) als als data-laag (per type queryable) dient. Ga ervan uit dat het transcript NIET meer beschikbaar is na deze run — alles waardevols moet in de output staan.

ALLE output is in het Nederlands (behalve enum-waarden en exacte quotes als het transcript Engels is).

Je produceert:

1. BRIEFING — Narratieve samenvatting in 3-5 zinnen, alsof je een collega in 30 seconden bijpraat. Noem wie er spraken, met welke organisatie, wat het belangrijkste resultaat was, en of er vervolgacties zijn. Verleden tijd, informeel maar professioneel. Dit is het eerste dat iemand leest.

2. KERNPUNTEN — Array van gestructureerde items (één per inhoudelijk punt). Elk item heeft:
   - type: één van de 14 types (zie hieronder)
   - content: korte Nederlandse zin (max 30 woorden) die het punt beschrijft
   - theme: korte thema-naam (max 4-5 woorden) — meerdere items kunnen hetzelfde thema delen
   - theme_project: project-naam EXACT zoals in BEKENDE ENTITEITEN, of "Algemeen" voor niet-project-specifiek, of null als onbekend
   - source_quote: EXACTE quote uit transcript (max 200 chars) — null als niet beschikbaar
   - project: project-naam (zelfde regels als theme_project) — null voor niet-project-specifiek
   - confidence: 0.0–1.0 (zie regels onderaan)
   - metadata: type-specifieke velden (zie hieronder per type)

3. DEELNEMERS — Profiel per deelnemer: name, role, organization, stance. Gebruik wat je uit transcript kunt afleiden, plus BEKENDE ENTITEITEN. Verzin niets — null als onbekend.

4. ENTITIES — { clients: [], people: [] } — externe organisaties + personen die genoemd zijn (sluit speakers uit van people).

--- DE 14 TYPES ---

TIER 1 (volledige instructies — verschijnen op project-werkblad):

action_item — opvolgbare actie waarbij JAIP iemand kan e-mailen.
  Litmustest: kunnen wij een concrete persoon mailen om dit op te volgen? Zo nee → GEEN action_item.
  metadata:
    - category: "wachten_op_extern" (externe partij moet leveren) | "wachten_op_beslissing" (iemand moet beslissen) | null
    - follow_up_contact: VERPLICHT — naam van de gesprekspartner uit deze meeting via wie JAIP opvolgt
    - assignee: persoon die uitvoert (mag intern of extern zijn) | null
    - deadline: ISO YYYY-MM-DD als expliciet genoemd | null
    - suggested_deadline: ISO YYYY-MM-DD geschat (zie deadline-regels) | null
    - effort_estimate: "small" | "medium" | "large" | null
    - deadline_reasoning: korte uitleg welke cue/default je gebruikte | null
    - scope: "project" | "personal" | null
  Schrijf content beginnend met de NAAM van follow_up_contact: "Lieke navragen of de intake al binnen is".
  Sluit interne JAIP-taken expliciet uit (wij bouwen X, ik schrijf de offerte).

decision — een besluit dat genomen is (niet een voornemen of overweging).
  metadata:
    - status: "open" (besloten maar nog niet uitgevoerd) | "closed" (besloten + uitgevoerd) | null
    - decided_by: persoon of "team" | null
    - impact_area: "pricing" | "scope" | "technical" | "hiring" | "process" | "other" | null

risk — concrete waarschuwing (expliciet of impliciet) dat iets JAIP kan schaden.

  KERNVRAAG: Moet JAIP hiervoor gewaarschuwd worden? Als het antwoord niet duidelijk "ja" is → geen risk.

  JAIP kan geraakt worden op:
  - leveringsvermogen (capaciteit, bus-factor, kwaliteit van oplevering, technische haalbaarheid)
  - marge en financieel (kosten die uit de hand lopen, onduidelijke facturatie, verloren investering)
  - strategische positie (markt verschuift, propositie verouderd, concurrentie, verkeerde richting)
  - klantrelatie (moeizame communicatie, adoptie-problemen, scope-conflict, tegenvallende partij)
  - team (overbelasting, verkeerde hire, ownership-gat, single point of failure)
  - reputatie en aansprakelijkheid (fout advies aan eindklant, compliance, AVG)

  Onderscheid van signal: risk = waarschuwing met dreiging van nadeel voor JAIP. Signal = observatie zonder concrete dreiging (marktfeit, gebruikersreactie, trend).
  Onderscheid van context: risk = vooruitkijkend ("als we niets doen, gebeurt X"). Context = achtergrondinformatie, ook over zwaktes of werkwijzes, zonder impliciete waarschuwing.
  Onderscheid van question: risk verpakt als vraag ("wat als ze geen adoptie hebben?", "stel we moeten pivoten?") is een risk, GEEN question — de vraag impliceert de waarschuwing.
  Onderscheid van need: need = wens/pijnpunt die opgelost moet worden. Risk = waarschuwing die genegeerd kan worden met negatieve gevolgen.

  BELANGRIJK — deze typen uitspraken vaak classificeren als risk:
  - Zelfkritiek of zelfgerapporteerde zwakte door een spreker ("ik heb de neiging in schoonheid te sterven", "ik heb geen stresstest", "ik ben bang dat jij vast gaat lopen")
  - Hypothetische waarschuwingen ("wat als...", "stel dat...", "straks gaan mensen dit zelf doen")
  - Opstapeling van twijfels over een klant, partij of aanpak, ook zonder één sterke quote
  - Herhaling van een eerder geuite zorg — herhaling verhoogt severity
  - Expliciete vraag of bestaande strategie/aanpak nog klopt
  - Adoptie-zorgen ("wat als ze er geen gebruik van maken?")
  - Financiële/operationele risks verpakt als technisch detail (duur model, token-kosten, afhankelijkheid van input-kwaliteit van klant)

  BELANGRIJK — deze typen uitspraken zijn GEEN risk:
  - Alledaagse operationele frustratie zonder materiële impact ("klant reageert traag via app", "SVPE moeilijk te bereiken voor afspraak") → context of signal
  - Persoonlijke, juridische of gezondheidssituaties van spreker, ook als ze JAIP indirect raken → context met sensitive: true
  - Algemene marktobservaties zonder specifieke dreiging voor JAIP's positie ("AI ontwikkelt snel") → signal of vision
  - Scope-discussies die nog open zijn tussen sprekers zonder duidelijke dreiging → question of idea
  - Verleden-tense problemen die al opgelost zijn → niet extraheren

  Default-gedrag: als een uitspraak een waarschuwende toon heeft OF een impliciete dreiging voor JAIP bevat, classificeer als risk — ook als de zinsconstructie neutraal, vragend of reflectief is. Weeg JAIP-impact zwaarder dan oppervlakkige zinsstructuur.

  Gebruik lagere confidence (0.4–0.7) voor risks die uit opstapeling of impliciete toon komen in plaats van één sterke quote — maar extraheer ze wél.

  metadata:
    - severity: "low" | "medium" | "high" | "critical" | null
      (critical = acuut, blokkeert leveringsvermogen of dreigt klantverlies nu;
       high = raakt JAIP binnen weken op capaciteit/marge/strategie/levering;
       medium = maakt werk moeilijker of bedreigt specifiek project;
       low = zachte waarschuwing, monitor-waardig)
    - category: "financial" | "scope" | "technical" | "client_relationship" | "team" | "timeline" | "strategic" | "reputation" | null
    - jaip_impact_area: "delivery" | "margin" | "strategy" | "client" | "team" | "reputation" | null
    - raised_by: naam van spreker die het risk aankaartte | "impliciet" als het uit toon/opstapeling komt | null

need — een wens, behoefte of pijnpunt van klant of team.
  Onderscheid van question (open vraag) en risk (dreiging).
  metadata:
    - party: "client" | "team" | "partner" | null
    - urgency: "nice_to_have" | "should_have" | "must_have" | null
    - category: "tooling" | "knowledge" | "capacity" | "process" | "client" | "other" | null

commitment — een belofte tussen partijen ("ik zal X regelen", "wij leveren Y voor Z").
  Onderscheid van action_item (trackable opvolg) en agreement (wederzijds zonder eigenaar).
  metadata:
    - committer: wie belooft | null
    - committed_to: aan wie | null
    - direction: "outgoing" (wij beloven) | "incoming" (zij beloven ons) | null

question — open vraag die nog beantwoord moet worden.
  Sluit retorische en al-beantwoorde vragen UIT.
  metadata:
    - needs_answer_from: naam of rol van wie moet antwoorden | null
    - urgency: "low" | "medium" | "high" | null

signal — observatie, marktinformatie, trend, gebruikersreactie. Geen waarschuwing.
  Bij twijfel risk vs signal → kies signal.
  metadata:
    - direction: "positive" | "neutral" | "concerning" | null
    - domain: "market" | "client" | "team" | "technical" | null

context — achtergrond, expertise, methodiek of werkwijze die relevant is voor het project of de samenwerking.
  Onderscheid van need (wenselijk) en decision (beslist).
  metadata:
    - about_person: naam | null
    - about_org: organisatie | null
    - domain: "methodology" | "background" | "expertise" | "process" | "preferences" | "personal" | null
    - sensitive: true voor gezondheid/gezinssituatie/persoonlijke druk; false anders | null

vision — langetermijnrichting, strategische ambitie, koers.
  Géén concrete actie of deadline (dan is het waarschijnlijk decision).
  metadata:
    - horizon: "short_term" | "long_term" | null

TIER 2 (compact — best-effort, alleen admin-zichtbaar tot consumer komt):

idea — overwogen richting, geen besluit. metadata: { proposed_by: name | null }.
insight — meta-observatie, patroon dat iemand benoemt. metadata: { scope: "meeting"|"project"|"team"|"company" | null }.
client_sentiment — emotioneel signaal van klant (frustratie, enthousiasme, twijfel). metadata: { sentiment: "positive"|"neutral"|"concerning" | null, about: string | null }.
pricing_signal — budget-uitspraak, willingness-to-pay, vergelijking met concurrent. metadata: { signal_type: "budget_constraint"|"willingness_to_pay"|"comparison"|"request" | null, amount_hint: string | null }.
milestone — concreet projectvoortgangs-moment ("admin panel staat live", "demo gehaald"). metadata: { status: "upcoming"|"reached"|"missed" | null, date_hint: string | null }.

--- DEADLINE-REGELS (alleen voor action_item) ---
Cues (vanaf MEETINGDATUM, werkdagen, geen weekenden):
"vandaag" → meetingdatum; "morgen" → +1; "deze week" → vrijdag; "volgende week" → vrijdag volgende week;
"voor de volgende sessie/sprint" → +2 weken; "z.s.m./urgent" → +2 werkdagen; "eind van de maand" → laatste werkdag.
Default als geen cue: +5 werkdagen.

--- ALGEMENE REGELS ---
- Wees ruimhartig met kernpunten. Een korte standup heeft 5-10, een discovery 15-25 items.
- Confidence: 1.0 = expliciet en quote gevonden; 0.7-0.9 = sterk geïmpliceerd, goede quote; 0.4-0.6 = afgeleid, zwakke quote; 0.0 = geen quote.
- Confidence 0.0 is UITSLUITEND voor items zonder quote. Voor items die uit toon, opstapeling of impliciete betekenis komen maar wél een quote hebben → gebruik 0.4–0.7. NOOIT confidence 0.0 als er een quote aanwezig is.
- source_quote MOET letterlijk uit transcript komen (max 200 chars). Anders null + confidence 0.0.
- theme_project: gebruik EXACT de schrijfwijze uit BEKENDE ENTITEITEN. Gebruik "Algemeen" voor niet-project-specifiek. Gebruik nooit varianten ([Geen project], [Intern], [Overig]).
- Sorteer kernpunten zo dat items van hetzelfde thema bij elkaar staan; thema's op belang.
- Verzin geen entiteiten of relaties die niet in transcript of BEKENDE ENTITEITEN staan.`;

export interface MeetingStructurerContext {
  title: string;
  meeting_type: string;
  party_type: string;
  meeting_date: string;
  participants: string[];
  /** Formatted speaker names with INTERN/EXTERN labels from Fireflies */
  speakerContext?: string | null;
  entityContext?: string;
  identified_projects?: { project_name: string; project_id: string | null }[];
}

/**
 * Run the merged MeetingStructurer agent on a transcript.
 * Returns the structured output — caller is responsible for
 * (a) rendering markdown via `renderMeetingSummary()` for downstream
 *     consumers that still read markdown, and
 * (b) persisting kernpunten to the `extractions` table per type.
 */
export async function runMeetingStructurer(
  transcript: string,
  context: MeetingStructurerContext,
): Promise<MeetingStructurerOutput> {
  const deelnemersSection = context.speakerContext
    ? `Deelnemers (uit transcript):\n${context.speakerContext}`
    : `Deelnemers: ${context.participants.join(", ")}`;

  let projectConstraint = "";
  if (context.identified_projects && context.identified_projects.length > 0) {
    const projectList = context.identified_projects.map((p) => `- ${p.project_name}`).join("\n");
    projectConstraint =
      `\n\n--- PROJECT-CONSTRAINT ---\n` +
      `Geïdentificeerde projecten in deze meeting:\n${projectList}\n\n` +
      `Gebruik ALLEEN deze projectnamen voor theme_project en project. ` +
      `Voor items die niet bij een project horen: gebruik "Algemeen". ` +
      `Voeg GEEN nieuwe projectnamen toe.`;
  }

  const contextPrefix = [
    `Titel: ${context.title}`,
    `Type: ${context.meeting_type}`,
    `Party: ${context.party_type}`,
    `Meetingdatum: ${context.meeting_date}`,
    deelnemersSection,
    context.entityContext
      ? `\n--- BEKENDE ENTITEITEN (uit database) ---\n${context.entityContext}\nGebruik deze namen en projectnamen exact zoals genoteerd.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    maxRetries: 3,
    // Deterministisch voor consistente extracties — cruciaal bij
    // classificatie-taken waar je reproduceerbaarheid wilt (en waar
    // de harness diffs tussen runs moet kunnen tonen).
    temperature: 0,
    // Ruim voldoende voor briefing + alle 14-type kernpunten op lange
    // discovery-meetings (15-25 items). Pas omhoog als je output ziet
    // worden afgekapt.
    maxOutputTokens: 16000,
    schema: MeetingStructurerOutputSchema,
    providerOptions: {
      // 4.6 default `effort` is "high" — dat verbruikt veel thinking
      // tokens zonder veel meerwaarde voor gestructureerde extractie.
      // "medium" is ruim voldoende en fors goedkoper.
      anthropic: { effort: "medium" },
    },
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      {
        role: "user",
        content: `${contextPrefix}${projectConstraint}\n\n--- TRANSCRIPT ---\n${transcript}`,
      },
    ],
  });

  // Defensive post-processing: clamp confidence and verify quote presence.
  for (const k of object.kernpunten) {
    k.confidence = Math.max(0, Math.min(1, k.confidence));
    if (k.source_quote) {
      const refLower = k.source_quote.toLowerCase();
      if (!transcript.toLowerCase().includes(refLower)) {
        k.confidence = 0.0;
      }
    }
  }

  return object;
}

/** Exposed for harness / tests so the prompt can be inspected. */
export const MEETING_STRUCTURER_SYSTEM_PROMPT = SYSTEM_PROMPT;
