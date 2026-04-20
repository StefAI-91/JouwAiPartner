import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
import { emptyToNull, normaliseForQuoteMatch, sentinelToNull } from "../utils/normalise";

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

const SYSTEM_PROMPT = readFileSync(
  // packages/ai/src/agents/ → ../../prompts/ (binnen @repo/ai package)
  resolve(dirname(fileURLToPath(import.meta.url)), "../../prompts/meeting_structurer.md"),
  "utf8",
).trimEnd();

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
    // Ruim budget voor briefing + alle 14-type kernpunten op lange
    // discovery-meetings (15-25 items). Bij effort "high" telt dit als
    // thinking + output samen — thinking kan 15-25k tokens zijn op
    // cross-turn reasoning, dus ruim boven de ~10k output-tokens die we
    // voor 20-25 items nodig hebben.
    maxOutputTokens: 32000,
    schema: MeetingStructurerOutputSchema,
    providerOptions: {
      // Effort "high" nodig voor cross-turn patroon-detectie: strategische
      // en team-risks komen uit opstapeling over meerdere turns, niet uit
      // één sterke quote. Op medium miste het model ze systematisch op
      // de 6 referentie-meetings. Kosten-impact: ~$0.15-0.25 extra per
      // meeting (vooral door extra thinking-tokens).
      anthropic: { effort: "high" },
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
  // de inhoud mis is. Mismatch cap't confidence op 0.25 (niet 0.3), zodat
  // het item wel surfaced in de UI maar duidelijk "niet verifieerbaar" is.
  // 0.25 is bewust ≠ 0.3 omdat 0.3 een geldige model-output is onder de
  // v5-RiskSpecialist-CONFIDENCE-DISCIPLINE (bewuste twijfelclassificatie).
  const normalisedTranscript = normaliseForQuoteMatch(transcript);
  for (const k of object.kernpunten) {
    k.confidence = Math.max(0, Math.min(1, k.confidence));
    if (k.source_quote && k.source_quote !== "") {
      const refNorm = normaliseForQuoteMatch(k.source_quote);
      if (!normalisedTranscript.includes(refNorm)) {
        k.confidence = Math.min(k.confidence, 0.25);
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
        reasoning: emptyToNull(k.reasoning),
        // Strip metadata-velden die niet bij het type horen. Het model
        // levert altijd alle universele velden (Anthropic 16-union limiet),
        // maar alleen de type-specifieke velden horen verder in de pipeline.
        // Null-waarden binnen toegestane velden blijven behouden.
        metadata: filterMetadataByType(k.type, normaliseMetadata(k.metadata)),
      }),
    ),
  };
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

/** Exposed for harness / tests so the prompt can be inspected. */
export const MEETING_STRUCTURER_SYSTEM_PROMPT = SYSTEM_PROMPT;
