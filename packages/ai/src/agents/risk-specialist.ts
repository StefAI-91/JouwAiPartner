import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  RiskSpecialistRawOutputSchema,
  type RiskSpecialistItem,
  type RiskSpecialistOutput,
  type RawRiskSpecialistOutput,
} from "../validations/risk-specialist";
import { emptyToNull, sentinelToNull } from "../utils/normalise";

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
export const RISK_SPECIALIST_PROMPT_VERSION = "v5";

/**
 * Model-id die aan Anthropic wordt gegeven én als audit-waarde naar
 * `experimental_risk_extractions.model` gaat. Één bron-van-waarheid zodat
 * de pipeline niet meer kan drift'en ten opzichte van wat er daadwerkelijk
 * draait (zie eerdere bug: tracker logde Haiku terwijl agent op Sonnet liep).
 */
export const RISK_SPECIALIST_MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = readFileSync(
  // packages/ai/src/agents/ → ../../prompts/ (binnen @repo/ai package)
  resolve(dirname(fileURLToPath(import.meta.url)), "../../prompts/risk_specialist.md"),
  "utf8",
).trimEnd();

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
    model: anthropic(RISK_SPECIALIST_MODEL),
    maxRetries: 3,
    temperature: 0,
    // maxOutputTokens telt als thinking + response samen. Met 4000/2000
    // bleven er slechts 2000 tokens voor de response — bij v2-prompt met
    // extra instructieblokken gebruikt Haiku vaak al >2000 thinking-tokens
    // waardoor er geen output meer past en Anthropic 'no object generated'
    // terug geeft. 8000 totaal + 3000 thinking = 5000 output, ruim voor
    // 10 risks (~150-200 tokens per item, ~1500-2000 JSON-overhead).
    maxOutputTokens: 8000,
    schema: RiskSpecialistRawOutputSchema,
    providerOptions: {
      // Sonnet 4.6 accepteert de `effort`-parameter; "high" zet extended
      // thinking aan op het hoogste niveau (SDK kiest het budget).
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

  // Clamp naar [0,1] — Anthropic's schema kent geen min/max dus we borgen
  // de range hier. Bewust GEEN quote-mismatch-cap: de normaliser dekt
  // punctuatie/diakrieten niet af, waardoor vrijwel elke Sonnet-quote ten
  // onrechte op 0.25 gecapt werd. Downstream wil Sonnet's eigen confidence
  // gebruiken voor severity-filtering; quote-verificatie wordt later als
  // apart signaal toegevoegd (geen confidence-overschrijving).
  for (const r of object.risks) {
    r.confidence = Math.max(0, Math.min(1, r.confidence));
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
        reasoning: emptyToNull(r.reasoning),
      }),
    ),
  };
}

/** Exposed for harness + tests. */
export const RISK_SPECIALIST_SYSTEM_PROMPT = SYSTEM_PROMPT;
