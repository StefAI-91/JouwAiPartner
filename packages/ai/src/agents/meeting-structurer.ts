import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  MeetingStructurerOutputSchema,
  type MeetingStructurerOutput,
  type RawMeetingStructurerOutput,
  type Kernpunt,
  type MeetingStructurerParticipant,
} from "../validations/meeting-structurer";
import { filterMetadataByType } from "../extraction-types";

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
   - source_quote: EXACTE quote uit transcript (max 200 chars) — null als niet beschikbaar. MOET één aaneengesloten passage zijn — gebruik NOOIT '...' om twee quotes samen te plakken.
   - project: project-naam (zelfde regels als theme_project) — null voor niet-project-specifiek
   - confidence: 0.0–1.0 (zie regels onderaan)
   - follow_up_context: verplichte Nederlandse context-beschrijving (100-150 woorden) UITSLUITEND voor action_item-items; voor alle andere types: lege string ""
   - metadata: type-specifieke velden (zie hieronder per type)

3. DEELNEMERS — Profiel per deelnemer: name, role, organization, stance. Gebruik wat je uit transcript kunt afleiden, plus BEKENDE ENTITEITEN. Verzin niets — null als onbekend.

4. ENTITIES — { clients: [], people: [] } — externe organisaties + personen die genoemd zijn (sluit speakers uit van people).

--- DE 14 TYPES ---

TIER 1 (volledige instructies — verschijnen op project-werkblad):

action_item — een opvolgbare actie waarvan JAIP schade oploopt als ze niet gebeurt: klant verliezen, geld mislopen, beslissing blokkeren, partnership verwateren, of momentum verliezen op een deal.

  KERNVRAAG (JAIP-lens): Als niemand hier binnen de deadline opvolgt, loopt JAIP dan iets mis?
  Als het antwoord niet duidelijk "ja" is → geen action_item.

  LITMUSTEST (procedureel): Is er een concrete actor + een opvolg-moment (deadline of natuurlijk check-in) + kan JAIP iemand hierover aanspreken?
  Als één van deze drie ontbreekt → geen action_item.

  Beide tests moeten slagen.

  JAIP-categorieën (wat raakt JAIP als dit niet gebeurt):
  - client_opvolging: prospect/klant-actie, deal-momentum, input van klant, testje/pilot opvolgen
  - financieel: factuur versturen/bestrijden, kostenonderhandeling, betaling najagen, BTW/boekhouding
  - strategisch_besluit: intern besluit met impact, scope-discussie, partner-voorwaarden, prio-gesprek
  - partner_netwerk: lead uit netwerk nabellen, samenwerkings-voorstel, partner-afspraak concreet maken
  - interne_afstemming: interne check-in DIE JAIP BLOKKEERT — niet routine-overleg
  - overig: valt niet in bovenstaande maar voldoet wel aan beide tests

  BELANGRIJK — deze typen uitspraken zijn WEL action_item:
  - Interne trackable acties met eigenaar: "Wouter bespreekt X met Joep", "Stef reviewt de prompt"
  - Externe opvolg-acties: "Tibor stuurt voorstel naar klant", "iemand belt prospect na"
  - Financiële acties: "factuur versturen", "onderhandelen met leverancier"
  - Besluit-blokkades: "Wouter moet knoop doorhakken over scope"
  - Deal-momentum: "opvolgen wanneer testje van Robin is gedraaid"

  BELANGRIJK — deze typen uitspraken zijn GEEN action_item:
  - Pure werk-uitvoering: "wij bouwen feature X", "ik schrijf de offerte", "Stef codet de pipeline"
    (dit hoort in een backlog, niet in meetingopvolging)
  - Reflectief zonder deadline: "daar moet ik over nadenken", "we moeten het eens hebben over"
  - Voornemens zonder eigenaar: "we zouden eigenlijk...", "iemand moet X doen"
  - Operationele routine: "standup maandag", "facturatie einde van maand"
  - Gezamenlijke afspraken zonder opvolg-lus: "we plannen een meeting" (dit is een commitment, geen action_item)
  - Emotionele/meta-afspraken: "we moeten beter communiceren"

  Onderscheid met commitment: action_item heeft een trackable opvolg-lus + deadline waar JAIP op stuurt. Commitment is een belofte die via context geborgd wordt zonder actieve opvolging.

  Wees STRIKT: bij twijfel, geen action_item. Werk op precisie, niet op recall.

  VERPLICHTE VELDEN VOOR action_item (naast de standaard content/theme/source_quote/etc.):

  follow_up_context: VERPLICHT string, 100-150 woorden, in het Nederlands. Beschrijft voor een opvolg-AI:
    - Wat precies opgevolgd moet worden (inhoudelijk, concreet)
    - Waarom het besproken werd / waar het op voortbouwt
    - Wat de gewenste reactie of uitkomst is
    - Relevante nuances, blokkers of context uit het gesprek
    - Toon/relatie-context indien relevant (eerste contact, gevoelig onderwerp, lopende deal)
    Als je geen fatsoenlijke follow_up_context kunt schrijven (te weinig context in transcript), is het GEEN action_item. Extract niet.
    Gebruik alleen informatie die uit transcript of BEKENDE ENTITEITEN afleidbaar is. Verzin geen details.

  Schrijf content (de korte titel, max 30 woorden) beginnend met de NAAM van follow_up_contact: "Tibor stuurt voorstel over rollenverdeling inclusief The Dock-scenario".

  metadata voor action_item bevat UITSLUITEND deze velden:
    - jaip_category: "client_opvolging" | "financieel" | "strategisch_besluit" | "partner_netwerk" | "interne_afstemming" | "overig" | null
    - follow_up_contact: VERPLICHT — naam gesprekspartner uit deze meeting via wie JAIP opvolgt
    - assignee: persoon die de actie uitvoert (intern of extern) | null
    - deadline: ISO YYYY-MM-DD (zie deadline-regels) | null
    - effort_estimate: "small" | "medium" | "large" | null
    - scope: "project" (binnen lopend JAIP-project) | "personal" (netwerk/partner/interne afstemming) | null
    - contact_channel: "email" | "whatsapp" | "phone" | "meeting" | null
    - relationship_context: "prospect" | "lopende_klant" | "partner" | "intern" | "netwerk" | null

  Velden van andere types (severity, raised_by, sentiment, signal_type, party, horizon, urgency, status, category, impact_area, etc.) mogen NIET in het metadata-object van een action_item voorkomen — ook niet met null-waarde.

  Voorbeeld van een correct action_item:
  {
    "type": "action_item",
    "content": "Tibor stuurt voorstel over zijn rol en ownership in samenwerking, inclusief The Dock-scenario.",
    "theme": "Rollenverdeling samenwerking",
    "theme_project": "Algemeen",
    "source_quote": "moet jij mij dan niet juist een voorstel doen over hoe jij dat ziet?",
    "project": null,
    "confidence": 0.9,
    "follow_up_context": "Wouter heeft Tibor gevraagd een concreet voorstel te maken over hoe hij zijn rol en ownership in de samenwerking met JAIP ziet. Aanleiding: Tibor wil langetermijn iets opbouwen en participeren, niet per deal afgerekend worden. Wouter kan het niet voor Tibor invullen — Tibor moet het zelf schetsen. Specifiek genoemd: het scenario waarin The Dock strategische partner wordt en Tibor daar een rol tussenin speelt. Ook gevraagd: hoe het werkt bij grotere trajecten waar Tibor's verkoopwaarde duidelijk is (bijv. Levent), maar rollen na oplevering onduidelijk zijn. Gewenste uitkomst: een voorstel van Tibor dat Wouter kan beoordelen, waarna een vervolgmeeting gepland wordt. Gevoelig onderwerp — raakt Tibor's positie in het bedrijf.",
    "metadata": {
      "jaip_category": "strategisch_besluit",
      "follow_up_contact": "Tibor",
      "assignee": "Tibor",
      "deadline": "2026-04-22",
      "effort_estimate": "medium",
      "scope": "personal",
      "contact_channel": "email",
      "relationship_context": "partner"
    }
  }

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

  MEETINGS MET EXTERNE PROSPECTS/KLANTEN:
  Bij meetings met externe partijen (prospects, leads, klanten van JAIP) blijft de risk-lens strikt JAIP-gericht. Problemen van de externe partij zijn GEEN risk — die zijn op hun best een need, signal of context. Een risk is wat JAIP bedreigt in deze deal, relatie of verkoopproces:
  - Ambigue scope of ontbrekende pijnpunt bij prospect (geen concrete opdracht mogelijk)
  - Domeinkennis-gap tussen JAIP en prospect die levering kan schaden
  - Verkeerde verwachtingen of overcommitment tijdens het gesprek
  - Lange sales-cyclus zonder doorontwikkeling
  - Prospect verwart JAIP met ongeschikte diensten (bijv. interne training in plaats van AI-product)
  - Belangenconflicten met andere JAIP-klanten of -partners

  Problemen van de prospect zelf (hun bedrijfsrisico's, hun markt, hun productuitdagingen) → deze zijn kansen voor JAIP, geen risks voor JAIP.

  metadata:
    - severity: "low" | "medium" | "high" | "critical" | null
      (critical = acuut, blokkeert leveringsvermogen of dreigt klantverlies nu;
       high = raakt JAIP binnen weken op capaciteit/marge/strategie/levering;
       medium = maakt werk moeilijker of bedreigt specifiek project;
       low = zachte waarschuwing, monitor-waardig)
    - category: "financial" | "scope" | "technical" | "client_relationship" | "team" | "timeline" | "strategic" | "reputation" | null
    - jaip_impact_area: "delivery" | "margin" | "strategy" | "client" | "team" | "reputation" | null
    - raised_by: naam van spreker die het risk aankaartte | "impliciet" als het uit toon/opstapeling komt | null

  Voorbeeld van correct gevulde metadata voor een risk:
  "metadata": {
    "severity": "high",
    "category": "team",
    "jaip_impact_area": "delivery",
    "raised_by": "Wouter"
  }

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
    - domain: "methodology" | "background" | "expertise" | "process" | "preferences" | "personal" | null
    - sensitive: true voor gezondheid/gezinssituatie/persoonlijke druk; false anders | null
  Noem bij wie de context hoort (persoon/organisatie) expliciet in 'content'.

vision — langetermijnrichting, strategische ambitie, koers.
  Géén concrete actie of deadline (dan is het waarschijnlijk decision).
  metadata:
    - horizon: "short_term" | "long_term" | null

TIER 2 (compact — best-effort, alleen admin-zichtbaar tot consumer komt):

idea — overwogen richting, geen besluit. Noem de bedenker in 'content'.
insight — meta-observatie, patroon dat iemand benoemt. metadata: { scope: "meeting"|"project"|"team"|"company" | null }.
client_sentiment — emotioneel signaal van klant (frustratie, enthousiasme, twijfel). metadata: { sentiment: "positive"|"neutral"|"concerning" | null }. Noem waar het over gaat in 'content'.
pricing_signal — budget-uitspraak, willingness-to-pay, vergelijking met concurrent. metadata: { signal_type: "budget_constraint"|"willingness_to_pay"|"comparison"|"request" | null }. Noem bedragen/hints direct in 'content'.
milestone — concreet projectvoortgangs-moment ("admin panel staat live", "demo gehaald"). metadata: { status: "upcoming"|"reached"|"missed" | null }. Noem de datum/periode in 'content'.

--- DEADLINE-REGELS (alleen voor action_item) ---
Cues (vanaf MEETINGDATUM, werkdagen, geen weekenden):
"nu / zo / meteen / direct / gelijk / straks vandaag / later vandaag" → meetingdatum;
"vandaag" → meetingdatum;
"morgen" → +1;
"deze week" → vrijdag;
"dit weekend" → eerstvolgende maandag;
"volgende week" → vrijdag volgende week;
"voor de volgende sessie/sprint" → +2 weken;
"z.s.m. / urgent" → +2 werkdagen;
"eind van de maand" → laatste werkdag.
Default als geen cue aanwezig: +5 werkdagen.

--- ALGEMENE REGELS ---
- SPREKER-IDENTIFICATIE:
  Als het transcript sprekers labelt als "speaker_0", "speaker_1", "speaker_2" etc., identificeer de echte namen uit context:
  - Aanspreekvormen ("Tibor, één momentje" → aangesprokene is Tibor)
  - Zelfverwijzing ("dit is de dokter moment met Tibor" → spreker is Tibor)
  - Inhoudelijke rol en kruisverwijzing met BEKENDE ENTITEITEN
  Als een spreker echt niet te identificeren is, gebruik "onbekende spreker". Gebruik NOOIT "derde spreker", "speaker_2", "spreker 1" of varianten in de output — altijd een echte naam of "onbekende spreker".
- Wees ruimhartig met kernpunten. Een korte standup heeft 5-10, een discovery 15-25 items.
- Voor elk item in kernpunten is het metadata-object VERPLICHT gevuld met alle velden die bij het type horen. Vul elk veld in óf met een waarde uit de toegestane enum, óf expliciet met null. Een leeg metadata-object ({}) is NIET toegestaan. Als je geen waarde kunt bepalen, gebruik dan null — niet weglaten.
- Confidence-regels:
  * 0.9–1.0 = expliciet benoemd door spreker + letterlijke, duidelijke quote. Gebruik dit bij woorden als "ik ben bang dat", "dit is een risico", "we moeten waken voor", "wat als" met duidelijke dreiging, "gevaar", of concrete waarschuwende uitspraken.
  * 0.7–0.9 = sterk geïmpliceerd + goede quote aanwezig. De waarschuwing is duidelijk maar niet met expliciete risk-woorden geformuleerd.
  * 0.4–0.6 = afgeleid uit toon of opstapeling van meerdere uitspraken + quote aanwezig die dit ondersteunt maar niet zelfstandig overtuigt.
  * 0.0 = UITSLUITEND wanneer geen source_quote beschikbaar is.
- Gebruik NOOIT confidence 0.0 als source_quote gevuld is.
- Default neiging: als je twijfelt tussen 0.3 en 0.7, kies 0.7. Expliciete risks met goede quote horen niet onder de 0.6 te vallen.
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

  // Defensive post-processing: clamp confidence en verifieer quote-aanwezigheid.
  // Quote-vergelijking is tolerant voor smart/straight quotes, dashes en
  // whitespace — het model paraphraseert punctuatie regelmatig zonder dat
  // de inhoud mis is. Mismatch cap't confidence op 0.3 (niet zero), zodat
  // het item wel surfaced in de UI maar duidelijk "niet verifieerbaar" is.
  const normalisedTranscript = normaliseForQuoteMatch(transcript);
  for (const k of object.kernpunten) {
    k.confidence = Math.max(0, Math.min(1, k.confidence));
    if (k.source_quote && k.source_quote !== "") {
      const refNorm = normaliseForQuoteMatch(k.source_quote);
      if (!normalisedTranscript.includes(refNorm)) {
        k.confidence = Math.min(k.confidence, 0.3);
      }
    }
  }

  return normaliseStructurerOutput(object);
}

/**
 * Converteer "" en "n/a" sentinels (nodig in de Anthropic JSON Schema
 * om onder de 16-union limiet te blijven) terug naar null voor
 * downstream consumers (save-extractions, render-summary, UI).
 */
function normaliseStructurerOutput(raw: RawMeetingStructurerOutput): MeetingStructurerOutput {
  return {
    briefing: raw.briefing,
    entities: raw.entities,
    deelnemers: raw.deelnemers.map(
      (d): MeetingStructurerParticipant => ({
        name: d.name,
        role: emptyToNull(d.role),
        organization: emptyToNull(d.organization),
        stance: emptyToNull(d.stance),
      }),
    ),
    kernpunten: raw.kernpunten.map(
      (k): Kernpunt => ({
        type: k.type,
        content: k.content,
        theme: emptyToNull(k.theme),
        theme_project: emptyToNull(k.theme_project),
        source_quote: emptyToNull(k.source_quote),
        project: emptyToNull(k.project),
        confidence: k.confidence,
        follow_up_context: emptyToNull(k.follow_up_context),
        // Strip metadata-velden die niet bij het type horen. Het model
        // levert altijd alle universele velden (Anthropic 16-union limiet),
        // maar alleen de type-specifieke velden horen verder in de pipeline.
        // Null-waarden binnen toegestane velden blijven behouden.
        metadata: filterMetadataByType(k.type, normaliseMetadata(k.metadata)),
      }),
    ),
  };
}

function emptyToNull(s: string): string | null {
  return s === "" ? null : s;
}

function sentinelToNull<T extends string>(v: T): Exclude<T, "n/a"> | null {
  return v === "n/a" ? null : (v as Exclude<T, "n/a">);
}

function normaliseMetadata(
  m: RawMeetingStructurerOutput["kernpunten"][number]["metadata"],
): Kernpunt["metadata"] {
  return {
    effort_estimate: sentinelToNull(m.effort_estimate),
    impact_area: sentinelToNull(m.impact_area),
    severity: sentinelToNull(m.severity),
    jaip_impact_area: sentinelToNull(m.jaip_impact_area),
    party: sentinelToNull(m.party),
    horizon: sentinelToNull(m.horizon),
    sentiment: sentinelToNull(m.sentiment),
    signal_type: sentinelToNull(m.signal_type),
    sensitive: m.sensitive,
    category: sentinelToNull(m.category),
    scope: sentinelToNull(m.scope),
    status: sentinelToNull(m.status),
    urgency: sentinelToNull(m.urgency),
    direction: sentinelToNull(m.direction),
    domain: sentinelToNull(m.domain),
    follow_up_contact: emptyToNull(m.follow_up_contact),
    assignee: emptyToNull(m.assignee),
    deadline: emptyToNull(m.deadline),
    decided_by: emptyToNull(m.decided_by),
    raised_by: emptyToNull(m.raised_by),
    committer: emptyToNull(m.committer),
    committed_to: emptyToNull(m.committed_to),
    needs_answer_from: emptyToNull(m.needs_answer_from),
    jaip_category: emptyToNull(m.jaip_category),
    contact_channel: emptyToNull(m.contact_channel),
    relationship_context: emptyToNull(m.relationship_context),
  };
}

function normaliseForQuoteMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'") // smart single quotes → straight
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"') // smart double quotes → straight
    .replace(/[\u2013\u2014\u2212]/g, "-") // en/em dash + minus → hyphen
    .replace(/\u00a0/g, " ") // non-breaking space → regular
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}

/** Exposed for harness / tests so the prompt can be inspected. */
export const MEETING_STRUCTURER_SYSTEM_PROMPT = SYSTEM_PROMPT;
