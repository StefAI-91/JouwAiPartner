import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  ActionItemSpecialistRawOutputSchema,
  type ActionItemSpecialistItem,
} from "../../validations/action-item-specialist";
import { withAgentRun } from "../run-logger";
import {
  PROMPT_DIR,
  applyFollowUpResolver,
  buildContextPrefix,
  checkActionItemGate,
  extractTranscriptContext,
  normaliseActionItemSpecialistOutput,
} from "./shared";
import { validateFollowupAction } from "./validator";
import type {
  ActionItemGatedItem,
  ActionItemPromptVersion,
  ActionItemSpecialistContext,
  ActionItemSpecialistRunOptions,
  ActionItemSpecialistRunResult,
} from "./types";

/**
 * Action Item Specialist.
 *
 * Single-type specialist die action_items uit een transcript extraheert.
 * Volgt het Risk Specialist patroon: Sonnet 4.6 high-effort, strict schema,
 * sentinels voor onbekend, normalisatie naar null voor downstream.
 *
 * Vier promptversies leven naast elkaar:
 *  - v2: 4-eis-model (rol/toezegging/concreet/agency) met contrast-paren
 *  - v3: drie-vragen-model (leveren wij? / wachten wij? / termijn?) +
 *        gate-velden voor type C/D
 *  - v4: voorbeeld-zwaar — minimaal kader, gewicht ligt op contrast-paren
 *        die het model met pattern-matching kan toepassen ipv regels
 *        interpreteren
 *  - v5: v4 + sales-context-nuance (cold contact buiten scope, vervolg-
 *        acties op leads wél in scope) + A12 voorbeeld voor lead-vervolg
 * Caller kiest expliciet, anders default v2 voor backwards compat.
 */

export const ACTION_ITEM_SPECIALIST_DEFAULT_PROMPT_VERSION: ActionItemPromptVersion = "v2";
export const ACTION_ITEM_SPECIALIST_MODEL = "claude-sonnet-4-6";

/** @deprecated gebruik ACTION_ITEM_SPECIALIST_DEFAULT_PROMPT_VERSION of geef
 *  promptVersion expliciet mee aan runActionItemSpecialist. */
export const ACTION_ITEM_SPECIALIST_PROMPT_VERSION = ACTION_ITEM_SPECIALIST_DEFAULT_PROMPT_VERSION;

const PROMPT_FILE_BY_VERSION: Record<ActionItemPromptVersion, string> = {
  v2: "action_item_specialist.md",
  v3: "action_item_specialist_v3.md",
  v4: "action_item_specialist_v4.md",
  v5: "action_item_specialist_v5.md",
};

// Tijdens prompt-tuning lezen we de markdown vers per call: een dev-server
// herlaadt deze .ts niet als alleen de markdown verandert, en dan hangt de
// oude prompt in module-memory. Zodra de prompt stabiel is mag dit terug
// naar een module-level constant (zoals de andere agents).
function loadSystemPrompt(version: ActionItemPromptVersion): string {
  const path = resolve(PROMPT_DIR, PROMPT_FILE_BY_VERSION[version]);
  return readFileSync(path, "utf8").trimEnd();
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
  const contextPrefix = buildContextPrefix(context);

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

  // Mechanische gate: filter type C/D items zonder geldige grounding eruit.
  const normalised = normaliseActionItemSpecialistOutput(object);
  applyFollowUpResolver(normalised.items, context.meeting_date);
  const passed: ActionItemSpecialistItem[] = [];
  const gated: ActionItemGatedItem[] = [];
  for (const item of normalised.items) {
    const reason = checkActionItemGate({
      type_werk: item.type_werk,
      recipient_per_quote: item.recipient_per_quote,
      jaip_followup_quote: item.jaip_followup_quote ?? "",
      jaip_followup_action: item.jaip_followup_action,
    });
    if (reason) {
      gated.push({ item, reason });
    } else {
      passed.push(item);
    }
  }

  // Stage 3 validator: voor elk type C/D item dat de gate haalde, vraag een
  // adversariële Haiku-validator of jaip_followup_action: productive klopt.
  // Default aan; uit te zetten via options.validateAction = false.
  const shouldValidate = options.validateAction ?? true;
  const validatedPassed: ActionItemSpecialistItem[] = [];
  if (shouldValidate) {
    const validations = await Promise.all(
      passed.map(async (item) => {
        if (item.type_werk !== "C" && item.type_werk !== "D") return { item, validator: null };
        if (item.jaip_followup_action !== "productive") return { item, validator: null };
        try {
          const v = await validateFollowupAction({
            source_quote: item.source_quote ?? "",
            jaip_followup_quote: item.jaip_followup_quote ?? "",
            transcript_context: extractTranscriptContext(transcript, item.source_quote ?? ""),
            participants: context.participants.map((p) => p.name),
          });
          return { item, validator: v };
        } catch (err) {
          // Validator-failure = item doorlaten (fail-open). We willen niet dat
          // een 5xx van Anthropic alle type C/D items wegfiltert.
          console.error("[action-item-validator] crashed, item passes:", err);
          return { item, validator: null };
        }
      }),
    );
    for (const { item, validator } of validations) {
      if (validator && validator.verdict === "consumptive") {
        gated.push({
          item,
          reason: `validator-override: action herclassificeerd naar consumptive (${validator.reason})`,
          validator: { verdict: "consumptive", reason: validator.reason },
        });
      } else {
        validatedPassed.push(item);
      }
    }
  } else {
    validatedPassed.push(...passed);
  }

  const latencyMs = Date.now() - startedAt;
  const reasoningTokens = typeof usage?.reasoningTokens === "number" ? usage.reasoningTokens : null;

  return {
    output: { items: validatedPassed },
    gated,
    metrics: {
      latency_ms: latencyMs,
      input_tokens: typeof usage?.inputTokens === "number" ? usage.inputTokens : null,
      output_tokens: typeof usage?.outputTokens === "number" ? usage.outputTokens : null,
      reasoning_tokens: reasoningTokens,
    },
    promptVersion,
  };
}

/** Exposed voor harness + tests. Leest fresh van disk zodat de UI de
 *  prompt toont die de laatste run ook gebruikt. */
export function getActionItemSpecialistSystemPrompt(
  version: ActionItemPromptVersion = ACTION_ITEM_SPECIALIST_DEFAULT_PROMPT_VERSION,
): string {
  return loadSystemPrompt(version);
}
