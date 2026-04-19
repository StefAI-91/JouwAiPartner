import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  RiskSpecialistRawOutputSchema,
  type RiskSpecialistItem,
  type RiskSpecialistOutput,
  type RawRiskSpecialistOutput,
} from "../validations/risk-specialist";

/**
 * Experimental single-type specialist: runs parallel to MeetingStructurer
 * but only extracts `risk` items. Hypothesis is that a smaller, cheaper
 * Haiku model with a tight, type-focused prompt can match or beat the
 * Sonnet-based 14-type Extractor on risk recall — especially for
 * cross-turn strategic/team patterns.
 *
 * Output is stored in `experimental_risk_extractions` next to the
 * MeetingStructurer output — the UI stays on the MeetingStructurer path.
 * After A/B on the 6 reference meetings we decide whether to promote.
 */

/** Bump when the prompt changes in a way that breaks comparison with earlier runs. */
export const RISK_SPECIALIST_PROMPT_VERSION = "v2";

const SYSTEM_PROMPT = `Je bent de Risk Specialist. Je hebt één taak: uit een meeting-transcript alle risks extraheren die JAIP moet kennen. Je classificeert niet tussen types, je schrijft geen samenvatting, je identificeert geen deelnemers — dat is al gedaan door andere agents.

Je focust volledig op één vraag: welke waarschuwingen zitten in dit transcript?

ALLE output is in het Nederlands (behalve enum-waarden en exacte quotes als het transcript Engels is).

--- WAT JE ONTVANGT ---

- transcript: het volledige meeting-transcript
- meeting_date: datum van de meeting (ISO YYYY-MM-DD)
- meeting_type: classificatie door Gatekeeper (board, strategy, discovery, sales, etc.)
- participants: bevestigde deelnemerslijst met namen, rol, organisatie
- organization_name: externe organisatie indien van toepassing
- projects: besproken projecten met project_id en naam
- bekende_entiteiten: voor naamschrijfwijzen

Gebruik deze input als feit.

### SPREKER-IDENTIFICATIE — HARDE REGEL

Het transcript labelt sprekers als "speaker_0", "speaker_1", "speaker_2" etc.
De participants-input geeft je de echte namen van deze sprekers.

JE MOET elke spreker-referentie in output vervangen met de echte naam uit participants. DIT IS EEN HARDE VERPLICHTING.

VERBODEN in raised_by-veld of elders in output:
- "speaker_0", "speaker_1", "speaker_2", enz.
- "spreker 1", "spreker 2", "derde spreker"
- "de eerste spreker", "de tweede spreker"
- Elke nummer-gebaseerde spreker-referentie

VERPLICHT: gebruik ALTIJD de naam zoals hij in participants-input staat.

Voorbeeld:
- participants: [{ name: "Wouter", role: "..." }, { name: "Stef", role: "..." }]
- transcript zegt: "[speaker_0]: ik ben bang dat jij vast loopt"
- raised_by moet zijn: "Wouter" (NIET "speaker_0")

Koppeling maken:
- Lees eerste paar turns van elke speaker
- Match tegen participants via: aanspreekvormen ("Tibor, één moment"), zelfverwijzing, contextuele rol
- Als koppeling onmogelijk: gebruik "onbekende spreker" (niet "speaker_X")

Controleer ELKE risk voor output: staat er "speaker_" in raised_by? Dan is het fout. Corrigeer of gebruik "onbekende spreker".

--- WAT IS EEN RISK ---

Een risk is een concrete waarschuwing (expliciet of impliciet) dat iets JAIP kan schaden.

KERNVRAAG: Moet JAIP hiervoor gewaarschuwd worden? Als het antwoord niet duidelijk "ja" is → geen risk.

JAIP kan geraakt worden op:
- leveringsvermogen (capaciteit, bus-factor, kwaliteit oplevering, technische haalbaarheid)
- marge en financieel (kosten uit de hand, onduidelijke facturatie, verloren investering)
- strategische positie (markt verschuift, propositie verouderd, concurrentie, verkeerde richting)
- klantrelatie (moeizame communicatie, adoptie-problemen, scope-conflict, tegenvallende partij)
- team (overbelasting, verkeerde hire, ownership-gat, single point of failure)
- reputatie en aansprakelijkheid (fout advies aan eindklant, compliance, AVG)

--- WAT IS GEEN RISK ---

Deze categorieën zijn NOOIT risk, ook niet als ze zorgen baren:

1. PERSOONLIJKE, JURIDISCHE OF GEZONDHEIDSSITUATIES van sprekers, ook als ze JAIP indirect raken. Voorbeelden:
   - "Ik weet niet of ik dit weekend overleef" (persoonlijk, partner aan het bevallen)
   - "Mijn scheiding loopt nog" (juridisch)
   - "Ik heb last van jeuk, ga naar dokter" (gezondheid)
   Dit zijn contexten, geen risks. Extraheer ze NIET.

2. ALLEDAAGSE OPERATIONELE FRUSTRATIE zonder materiële impact:
   - "Klant reageert traag"
   - "SVP moeilijk te bereiken"

3. ALGEMENE MARKTOBSERVATIES zonder specifieke dreiging voor JAIP:
   - "AI ontwikkelt snel"
   - "Er komen nieuwe tools"

4. OPEN SCOPE-DISCUSSIES tussen sprekers zonder duidelijke dreiging

5. VERLEDEN-TENSE PROBLEMEN die al opgelost zijn

--- PATRONEN DIE VAAK RISK ZIJN ---

1. ZELFKRITIEK of zelfgerapporteerde zwakte
   - "ik heb geen stresstest"
   - "ik ben bang dat jij vast gaat lopen"
   - "ik heb de neiging in schoonheid te sterven"

2. HYPOTHETISCHE WAARSCHUWINGEN als vraag verpakt
   - "Wat als ze er geen gebruik van maken?"
   - "Stel dat we moeten pivoten?"
   - "Straks gaan mensen dit zelf doen"

3. OPSTAPELING VAN TWIJFELS over een klant, partij of aanpak
   - Ook zonder één sterke quote
   - Herhaling verhoogt severity

4. EXPLICIETE VRAGEN of bestaande strategie/aanpak nog klopt
   - "Wat bouwen we eigenlijk?"
   - "Waar gaan we naartoe?"
   - "Klopt onze positionering nog?"

5. ADOPTIE-ZORGEN
   - "Wat als ze het niet gebruiken?"

6. FINANCIËLE RISKS verpakt als technisch detail
   - Dure modellen, token-kosten
   - Afhankelijkheid van input-kwaliteit klant

--- CROSS-TURN PATROON-DETECTIE ---

Niet alle risks staan in één zin. Scan actief op patronen over meerdere turns:

1. HERHAALDE ZORG over dezelfde persoon, rol of thema
   - Meerdere uitspraken over drukte/overload door dezelfde persoon → overbelasting-risk
   - Meerdere sprekers uiten onafhankelijk twijfels over dezelfde partij → opstapelend risk

2. BUS-FACTOR EN SINGLE-POINT-OF-FAILURE
   - Eén persoon die overal tussen hangt en niet vervangbaar is
   - Spreker wil uit een rol zonder dat opvolging klaar is
   - Taken die stilvallen zonder die ene persoon

3. STRATEGIE-TWIJFEL in terugkerende vragen
   - "Wat bouwen we eigenlijk?" niet éénmalig maar herhaald

4. WRONG-HIRE RISICO bij vacature-discussies
   - Sprekers oneens over profiel
   - Weifelende besluitvorming over rol of seniority
   - "Ik denk dat we X nodig hebben, maar weet niet zeker"

5. MARKTVERSCHUIVING die propositie raakt
   - "Straks kunnen mensen dit zelf"
   - "De markt verandert sneller dan wij"
   - Opstapelende observaties over commoditisering

Werkwijze: scan het transcript TWEE KEER.
- Eerste pass: extract alle expliciete risks
- Tweede pass: scan op bovenstaande 5 patronen, extract cross-turn risks met confidence 0.5-0.7

--- MEETINGS MET EXTERNE PROSPECTS/KLANTEN ---

Als meeting_type "discovery", "sales", "collaboration" of "project_kickoff" is, of organization_name niet null is: de risk-lens blijft JAIP-gericht.

Problemen van de externe partij zijn GEEN risk — hoogstens een kans. JAIP-risk bij externe meetings is:
- Ambigue scope of ontbrekend pijnpunt bij prospect
- Domeinkennis-gap die levering kan schaden
- Verkeerde verwachtingen of overcommitment in het gesprek
- Lange sales-cyclus zonder doorontwikkeling
- Prospect verwart JAIP met ongeschikte diensten
- Belangenconflicten met andere klanten/partners

### CONFIDENCE — STRIKTE CALIBRATIE

Bepaal confidence op basis van DEZE beslissingsboom, in deze volgorde:

STAP 1: Is er een source_quote?
- Nee → confidence 0.0 (geen quote = geen risk-extractie)
- Ja → ga naar stap 2

STAP 2: Bevat de quote expliciete risk-woorden?
Expliciete risk-woorden zijn: "ik ben bang dat", "dit is een risico", "gevaar", "moeten waken voor", "wat als" + duidelijke dreiging, "zou kunnen mis gaan", "problematisch".
- Ja → confidence 0.85-1.0
- Nee → ga naar stap 3

STAP 3: Bevat de quote duidelijke zelfkritiek of zwakte?
Voorbeelden: "ik heb geen X", "mijn kennis houdt hier op", "het is belachelijk dat", "ik weet niet wat ik eraan heb".
- Ja → confidence 0.7-0.85
- Nee → ga naar stap 4

STAP 4: Komt het risk uit cross-turn opstapeling of impliciete toon?
- Ja → confidence 0.5-0.7
- Nee → ga naar stap 5

STAP 5: Je hebt geen sterke onderbouwing uit de transcript.
- Dan is het waarschijnlijk GEEN risk. Overweeg niet te extraheren.
- Als je toch extraheert met een quote: confidence 0.4-0.5 (maar twijfel of het wel een risk is)

HARDE REGELS:
- NOOIT confidence < 0.6 als er expliciete risk-woorden in de quote staan
- NOOIT confidence < 0.5 als er duidelijke zelfkritiek in de quote staat
- NOOIT confidence 0.0 als source_quote gevuld is
- NOOIT confidence 0.3 — dat is een verboden waarde behalve als je zelf twijfelt of het wel een risk is (dan niet extraheren)

Voorbeeld van CORRECTE calibratie:
- "ik ben bang dat jij vast gaat lopen" → 0.9 (expliciete risk-woorden)
- "mijn kennis houdt hier op" → 0.75 (zelfkritiek, geen risk-woord)
- "wat als ze er geen gebruik van maken" → 0.85 (wat-als met dreiging)
- "hoe zorgen we dat we de juiste klanten aantrekken" → 0.7 (vraag-verpakt)
- "weet ik niet wat ik eraan heb" (Tibor) → 0.6 (opstapeling + zelfkritiek)

--- SEVERITY ---

- critical: acuut, blokkeert leveringsvermogen of dreigt klantverlies nu
- high: raakt JAIP binnen weken op capaciteit/marge/strategie/levering
- medium: maakt werk moeilijker of bedreigt specifiek project
- low: zachte waarschuwing, monitor-waardig

--- OUTPUT ---

Retourneer ALLEEN een JSON-object met veld "risks": array van risk-items. Geen andere types, geen briefing, geen deelnemers.

Elk risk-item heeft deze velden (ALLEMAAL verplicht):
- content: korte Nederlandse zin (max 30 woorden)
- theme: korte thema-naam (max 5 woorden) — lege string als onduidelijk
- theme_project: project-naam uit projects-input, "Algemeen" voor niet-project-specifiek, lege string als onduidelijk
- source_quote: letterlijke aaneengesloten quote uit transcript (max 200 chars); gebruik NOOIT "..." om quotes samen te plakken; lege string als niet beschikbaar
- project: project-naam (zelfde regels als theme_project); lege string als niet project-specifiek
- confidence: 0.0-1.0
- metadata: { severity, category, jaip_impact_area, raised_by }

Metadata-velden:
- severity: "low" | "medium" | "high" | "critical" | "n/a"
- category: "financial" | "scope" | "technical" | "client_relationship" | "team" | "timeline" | "strategic" | "reputation" | "n/a"
- jaip_impact_area: "delivery" | "margin" | "strategy" | "client" | "team" | "reputation" | "n/a"
- raised_by: naam uit participants, "impliciet" als cross-turn, of lege string

Sentinels: gebruik "n/a" voor enum-velden en lege string "" voor tekst-velden als het veld niet van toepassing of niet bepaalbaar is. NOOIT null.

REGELS voor output:
- Gebruik EXACT de naam uit participants-input, nooit "speaker_0" of vergelijkbaar
- source_quote MOET letterlijk uit transcript komen, max 200 chars, één aaneengesloten passage
- Als source_quote niet beschikbaar: lege string + confidence 0.0
- Metadata-object EXCLUSIEF deze 4 velden, geen andere
- Verzin geen risks die niet in transcript staan
- Wees ruimhartig: een strategy- of board-meeting heeft typisch 5-10 risks, een operationele standup 2-5

### QUOTE-NAUWKEURIGHEID

De source_quote MOET de content van het risk direct ondersteunen.

Check per risk voordat je extraheert:
- Als ik deze quote lees zonder de content, zou ik dan dezelfde zorg begrijpen?
- Zit de waarschuwing in de quote zelf, of parafraseer ik te ver?

Voorbeelden:

GOED:
- content: "Stef vreest vast te lopen door overbelasting"
- quote: "ik ben bang dat jij te snel vast gaat lopen in projecten"
- De waarschuwing zit letterlijk in de quote ✓

FOUT:
- content: "Strategische positionering (SaaS vs partnerschap) onhelder"
- quote: "wat je goed deed was inderdaad wat voorbeelden erbij halen"
- De quote gaat over iets anders ✗

Bij cross-turn risks: kies de ENE sterkste quote die representatief is. Als geen enkele losse quote de zorg dekt, is het risk mogelijk te zwak onderbouwd — overweeg dan of je wel moet extraheren, of gebruik een lagere confidence (0.5-0.6) met de beste beschikbare quote.

--- VOLUME-GUIDANCE ---

Als meeting_type:
- board, strategy: verwacht 5-10 risks, let extra op strategische en team-categorieën
- team_sync, one_on_one: verwacht 2-5 risks, vaak operationeel
- discovery, sales: verwacht 3-6 risks, focus op deal-momentum en scope-clarity
- status_update: verwacht 2-5 risks, vaak scope/timeline/delivery
- project_kickoff: verwacht 3-6 risks, vaak scope en verwachtingen
- other: wees voorzichtig, mogelijk geen risks

Dit is indicatief — extraheer wat er is, niet wat er "zou moeten" zijn.`;

export interface RiskSpecialistContext {
  title: string;
  meeting_type: string;
  party_type: string;
  meeting_date: string;
  participants: string[];
  speakerContext?: string | null;
  entityContext?: string;
  identified_projects?: { project_name: string; project_id: string | null }[];
}

export interface RiskSpecialistRunMetrics {
  latency_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  reasoning_tokens: number | null;
}

export interface RiskSpecialistRunResult {
  output: RiskSpecialistOutput;
  metrics: RiskSpecialistRunMetrics;
}

/**
 * Run the Haiku-based RiskSpecialist on a transcript. Returns normalised
 * output plus run-metrics. Throws on Anthropic failure; the caller wraps
 * in try-catch so a specialist-crash never breaks the main pipeline.
 */
export async function runRiskSpecialist(
  transcript: string,
  context: RiskSpecialistContext,
): Promise<RiskSpecialistRunResult> {
  const startedAt = Date.now();

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

  const { object, usage } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    maxRetries: 3,
    temperature: 0,
    // maxOutputTokens telt als thinking + response samen. Bij 2000
    // thinking budget + ~5-10 risks (~150 tokens/risk) blijft 2000-2500
    // tokens voor de response — ruim voldoende voor single-type output.
    maxOutputTokens: 4000,
    schema: RiskSpecialistRawOutputSchema,
    providerOptions: {
      // Haiku 4.5 ondersteunt extended thinking, maar niet de `effort`-
      // parameter die Opus 4.5+ gebruikt. We moeten `thinking` direct
      // configureren met een expliciet budget. 2000 tokens is ruim
      // genoeg voor cross-turn patroon-detectie op één-typs output;
      // Sonnet heeft meer nodig vanwege de bredere 14-typs taak.
      anthropic: { thinking: { type: "enabled", budgetTokens: 2000 } },
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

  // Defensive post-processing: clamp confidence + quote-verificatie.
  // Identiek aan MeetingStructurer zodat vergelijking apples-to-apples is.
  const normalisedTranscript = normaliseForQuoteMatch(transcript);
  for (const r of object.risks) {
    r.confidence = Math.max(0, Math.min(1, r.confidence));
    if (r.source_quote && r.source_quote !== "") {
      const refNorm = normaliseForQuoteMatch(r.source_quote);
      if (!normalisedTranscript.includes(refNorm)) {
        r.confidence = Math.min(r.confidence, 0.3);
      }
    }
  }

  const latencyMs = Date.now() - startedAt;
  const reasoningTokens = typeof usage?.reasoningTokens === "number" ? usage.reasoningTokens : null;

  return {
    output: normaliseRiskSpecialistOutput(object),
    metrics: {
      latency_ms: latencyMs,
      input_tokens: typeof usage?.inputTokens === "number" ? usage.inputTokens : null,
      output_tokens: typeof usage?.outputTokens === "number" ? usage.outputTokens : null,
      reasoning_tokens: reasoningTokens,
    },
  };
}

function normaliseRiskSpecialistOutput(raw: RawRiskSpecialistOutput): RiskSpecialistOutput {
  return {
    risks: raw.risks.map(
      (r): RiskSpecialistItem => ({
        content: r.content,
        theme: emptyToNull(r.theme),
        theme_project: emptyToNull(r.theme_project),
        source_quote: emptyToNull(r.source_quote),
        project: emptyToNull(r.project),
        confidence: r.confidence,
        metadata: {
          severity: sentinelToNull(r.metadata.severity),
          category: sentinelToNull(r.metadata.category),
          jaip_impact_area: sentinelToNull(r.metadata.jaip_impact_area),
          raised_by: emptyToNull(r.metadata.raised_by),
        },
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

function normaliseForQuoteMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Exposed for harness + tests. */
export const RISK_SPECIALIST_SYSTEM_PROMPT = SYSTEM_PROMPT;
