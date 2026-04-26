import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  ActionItemSpecialistRawOutputSchema,
  type ActionItemSpecialistItem,
  type ActionItemSpecialistOutput,
  type RawActionItemSpecialistOutput,
} from "../validations/action-item-specialist";
import { emptyToNull, sentinelToNull } from "../utils/normalise";
import { withAgentRun } from "./run-logger";

/**
 * Action Item Specialist.
 *
 * Single-type specialist die action_items uit een transcript extraheert.
 * Volgt het Risk Specialist patroon: Sonnet 4.6 high-effort, strict schema,
 * sentinels voor onbekend, normalisatie naar null voor downstream.
 *
 * Twee promptversies leven naast elkaar:
 *  - v2: 4-eis-model (rol/toezegging/concreet/agency) met contrast-paren
 *  - v3: drie-vragen-model (leveren wij? / wachten wij? / termijn?)
 * Caller kiest expliciet, anders default v2 voor backwards compat.
 */

export type ActionItemPromptVersion = "v2" | "v3";

export const ACTION_ITEM_SPECIALIST_DEFAULT_PROMPT_VERSION: ActionItemPromptVersion = "v2";
export const ACTION_ITEM_SPECIALIST_MODEL = "claude-sonnet-4-6";

/** @deprecated gebruik ACTION_ITEM_SPECIALIST_DEFAULT_PROMPT_VERSION of geef
 *  promptVersion expliciet mee aan runActionItemSpecialist. */
export const ACTION_ITEM_SPECIALIST_PROMPT_VERSION = ACTION_ITEM_SPECIALIST_DEFAULT_PROMPT_VERSION;

const PROMPT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../prompts");

const PROMPT_FILE_BY_VERSION: Record<ActionItemPromptVersion, string> = {
  v2: "action_item_specialist.md",
  v3: "action_item_specialist_v3.md",
};

// Tijdens prompt-tuning lezen we de markdown vers per call: een dev-server
// herlaadt deze .ts niet als alleen de markdown verandert, en dan hangt de
// oude prompt in module-memory. Zodra de prompt stabiel is mag dit terug
// naar een module-level constant (zoals de andere agents).
function loadSystemPrompt(version: ActionItemPromptVersion): string {
  const path = resolve(PROMPT_DIR, PROMPT_FILE_BY_VERSION[version]);
  return readFileSync(path, "utf8").trimEnd();
}

export interface ActionItemSpecialistContext {
  title: string;
  meeting_type: string;
  party_type: string;
  meeting_date: string;
  participants: string[];
}

export interface ActionItemSpecialistRunOptions {
  /** Welke promptversie gebruiken. Default v2. */
  promptVersion?: ActionItemPromptVersion;
}

export interface ActionItemSpecialistRunMetrics {
  latency_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  reasoning_tokens: number | null;
}

export interface ActionItemSpecialistRunResult {
  output: ActionItemSpecialistOutput;
  metrics: ActionItemSpecialistRunMetrics;
  promptVersion: ActionItemPromptVersion;
}

/**
 * Run de Action Item Specialist op een transcript. Throws bij Anthropic-failure;
 * caller verantwoordelijk voor try-catch zodat een specialist-crash de
 * hoofdpijplijn niet breekt (relevant zodra deze in de gatekeeper-pipeline
 * komt te hangen — voor v1 alleen via harness).
 */
export async function runActionItemSpecialist(
  transcript: string,
  context: ActionItemSpecialistContext,
  options: ActionItemSpecialistRunOptions = {},
): Promise<ActionItemSpecialistRunResult> {
  const startedAt = Date.now();
  const promptVersion = options.promptVersion ?? ACTION_ITEM_SPECIALIST_DEFAULT_PROMPT_VERSION;
  const systemPrompt = loadSystemPrompt(promptVersion);

  const contextPrefix = [
    `Titel: ${context.title}`,
    `Type: ${context.meeting_type}`,
    `Party: ${context.party_type}`,
    `Meetingdatum: ${context.meeting_date}`,
    `Deelnemers: ${context.participants.join(", ")}`,
  ].join("\n");

  const { object, usage } = await withAgentRun(
    {
      agent_name: "action-item-specialist",
      model: ACTION_ITEM_SPECIALIST_MODEL,
      prompt_version: promptVersion,
    },
    async () => {
      const res = await generateObject({
        model: anthropic(ACTION_ITEM_SPECIALIST_MODEL),
        maxRetries: 3,
        temperature: 0,
        // Zelfde overweging als Risk Specialist: maxOutputTokens dekt
        // thinking + response. 8000 totaal geeft ~5000 voor response,
        // ruim voor 15-20 items (~150-200 tokens per item + overhead).
        maxOutputTokens: 8000,
        schema: ActionItemSpecialistRawOutputSchema,
        providerOptions: {
          anthropic: { effort: "high" },
        },
        messages: [
          {
            role: "system",
            content: systemPrompt,
            providerOptions: {
              anthropic: { cacheControl: { type: "ephemeral" } },
            },
          },
          {
            role: "user",
            content: `${contextPrefix}\n\n--- TRANSCRIPT ---\n${transcript}`,
          },
        ],
      });
      return { result: { object: res.object, usage: res.usage }, usage: res.usage };
    },
  );

  // Clamp naar [0,1] — Anthropic's schema kent geen min/max constraints.
  for (const item of object.items) {
    item.confidence = Math.max(0, Math.min(1, item.confidence));
  }

  const latencyMs = Date.now() - startedAt;
  const reasoningTokens = typeof usage?.reasoningTokens === "number" ? usage.reasoningTokens : null;

  return {
    output: normaliseActionItemSpecialistOutput(object),
    metrics: {
      latency_ms: latencyMs,
      input_tokens: typeof usage?.inputTokens === "number" ? usage.inputTokens : null,
      output_tokens: typeof usage?.outputTokens === "number" ? usage.outputTokens : null,
      reasoning_tokens: reasoningTokens,
    },
    promptVersion,
  };
}

function normaliseActionItemSpecialistOutput(
  raw: RawActionItemSpecialistOutput,
): ActionItemSpecialistOutput {
  return {
    items: raw.items.map(
      (r): ActionItemSpecialistItem => ({
        content: r.content,
        follow_up_contact: r.follow_up_contact,
        assignee: emptyToNull(r.assignee),
        source_quote: emptyToNull(r.source_quote),
        project_context: emptyToNull(r.project_context),
        deadline: emptyToNull(r.deadline),
        type_werk: r.type_werk,
        category: sentinelToNull(r.category) as
          | "wachten_op_extern"
          | "wachten_op_beslissing"
          | null,
        confidence: r.confidence,
        reasoning: emptyToNull(r.reasoning),
      }),
    ),
  };
}

/** Exposed voor harness + tests. Leest fresh van disk zodat de UI de
 *  prompt toont die de laatste run ook gebruikt. */
export function getActionItemSpecialistSystemPrompt(
  version: ActionItemPromptVersion = ACTION_ITEM_SPECIALIST_DEFAULT_PROMPT_VERSION,
): string {
  return loadSystemPrompt(version);
}
