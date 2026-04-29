import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  ActionItemActionValidatorOutputSchema,
  type ActionItemActionValidatorOutput,
} from "../../validations/action-item-action-validator";
import { withAgentRun } from "../run-logger";
import { PROMPT_DIR } from "./shared";

const ACTION_VALIDATOR_PROMPT_PATH = resolve(PROMPT_DIR, "action_item_action_validator.md");
const ACTION_VALIDATOR_MODEL = "claude-haiku-4-5-20251001";

function loadActionValidatorPrompt(): string {
  return readFileSync(ACTION_VALIDATOR_PROMPT_PATH, "utf8").trimEnd();
}

export function getActionItemActionValidatorPrompt(): string {
  return loadActionValidatorPrompt();
}

export interface ActionItemActionValidatorInput {
  source_quote: string;
  jaip_followup_quote: string;
  /** Korte transcript-context rond de quote (±3 turns volstaat). */
  transcript_context: string;
  participants: string[];
}

export interface ActionItemActionValidatorResult {
  verdict: "productive" | "consumptive";
  reason: string;
  metrics: {
    latency_ms: number;
    input_tokens: number | null;
    output_tokens: number | null;
  };
}

/**
 * Stage 3 — Action Validator.
 *
 * Adversariële tweede pas: krijgt één type C/D item dat de extractor als
 * jaip_followup_action: productive heeft geclassificeerd, en oordeelt of
 * dat klopt. Default consumptive bij twijfel — bedoeld om rationalisatie
 * van de eerste-lijns-extractor te compenseren.
 *
 * Per item één Haiku-call; goedkoop genoeg om standaard te draaien
 * voor type C/D.
 */
export async function validateFollowupAction(
  input: ActionItemActionValidatorInput,
): Promise<ActionItemActionValidatorResult> {
  const startedAt = Date.now();
  const userBlock = [
    `Deelnemers: ${input.participants.join(", ")}`,
    "",
    `--- TRANSCRIPT-CONTEXT (±3 turns rond de quote) ---`,
    input.transcript_context,
    "",
    `--- TE VALIDEREN ITEM ---`,
    `source_quote: "${input.source_quote}"`,
    `jaip_followup_quote: "${input.jaip_followup_quote}"`,
    `claim: jaip_followup_action = productive`,
    "",
    `Klopt deze claim? Antwoord met verdict + reason.`,
  ].join("\n");

  const run = await withAgentRun(
    {
      agent_name: "action-item-action-validator",
      model: ACTION_VALIDATOR_MODEL,
      prompt_version: "v1",
    },
    async () => {
      const res = await generateObject({
        model: anthropic(ACTION_VALIDATOR_MODEL),
        maxRetries: 3,
        temperature: 0,
        maxOutputTokens: 2000,
        schema: ActionItemActionValidatorOutputSchema,
        messages: [
          {
            role: "system",
            content: loadActionValidatorPrompt(),
            providerOptions: {
              anthropic: { cacheControl: { type: "ephemeral" } },
            },
          },
          { role: "user", content: userBlock },
        ],
      });
      return { result: { object: res.object, usage: res.usage }, usage: res.usage };
    },
  );

  const validated: ActionItemActionValidatorOutput = run.object;

  return {
    verdict: validated.verdict,
    reason: validated.reason,
    metrics: {
      latency_ms: Date.now() - startedAt,
      input_tokens: typeof run.usage?.inputTokens === "number" ? run.usage.inputTokens : null,
      output_tokens: typeof run.usage?.outputTokens === "number" ? run.usage.outputTokens : null,
    },
  };
}
