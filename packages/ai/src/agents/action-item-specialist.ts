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
import {
  ActionItemCandidatesSchema,
  ActionItemJudgementsSchema,
  type ActionItemCandidate,
  type ActionItemJudgement,
} from "../validations/action-item-two-stage";
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

// ============================================================================
// TWO-STAGE MODE — candidate spotter + judge
// ============================================================================

const CANDIDATE_SPOTTER_PROMPT_PATH = resolve(PROMPT_DIR, "action_item_candidate_spotter.md");
const JUDGE_PROMPT_PATH = resolve(PROMPT_DIR, "action_item_judge.md");

const CANDIDATE_SPOTTER_MODEL = "claude-haiku-4-5-20251001";
const JUDGE_MODEL = "claude-sonnet-4-6";

function loadCandidateSpotterPrompt(): string {
  return readFileSync(CANDIDATE_SPOTTER_PROMPT_PATH, "utf8").trimEnd();
}

function loadJudgePrompt(): string {
  return readFileSync(JUDGE_PROMPT_PATH, "utf8").trimEnd();
}

export interface ActionItemTwoStageRunMetrics {
  spotter: {
    latency_ms: number;
    input_tokens: number | null;
    output_tokens: number | null;
    candidate_count: number;
  };
  judge: {
    latency_ms: number;
    input_tokens: number | null;
    output_tokens: number | null;
    reasoning_tokens: number | null;
    accept_count: number;
    reject_count: number;
  };
  total_latency_ms: number;
}

export interface ActionItemTwoStageRunResult {
  output: ActionItemSpecialistOutput;
  candidates: ActionItemCandidate[];
  judgements: ActionItemJudgement[];
  metrics: ActionItemTwoStageRunMetrics;
}

export interface ActionItemSpotterRunResult {
  candidates: ActionItemCandidate[];
  metrics: {
    latency_ms: number;
    input_tokens: number | null;
    output_tokens: number | null;
    candidate_count: number;
  };
}

/**
 * Standalone spotter-run voor tuning. Geeft de Haiku-output direct terug
 * zonder de judge te draaien — handig om alleen de spotter-prompt te
 * tunen op breedte/precision.
 */
export async function runActionItemCandidateSpotter(
  transcript: string,
  context: ActionItemSpecialistContext,
): Promise<ActionItemSpotterRunResult> {
  const startedAt = Date.now();
  const contextPrefix = [
    `Titel: ${context.title}`,
    `Type: ${context.meeting_type}`,
    `Party: ${context.party_type}`,
    `Meetingdatum: ${context.meeting_date}`,
    `Deelnemers: ${context.participants.join(", ")}`,
  ].join("\n");

  const run = await withAgentRun(
    {
      agent_name: "action-item-candidate-spotter",
      model: CANDIDATE_SPOTTER_MODEL,
      prompt_version: "v1",
    },
    async () => {
      const res = await generateObject({
        model: anthropic(CANDIDATE_SPOTTER_MODEL),
        maxRetries: 3,
        temperature: 0,
        maxOutputTokens: 40000,
        schema: ActionItemCandidatesSchema,
        messages: [
          {
            role: "system",
            content: loadCandidateSpotterPrompt(),
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

  return {
    candidates: run.object.candidates,
    metrics: {
      latency_ms: Date.now() - startedAt,
      input_tokens: typeof run.usage?.inputTokens === "number" ? run.usage.inputTokens : null,
      output_tokens: typeof run.usage?.outputTokens === "number" ? run.usage.outputTokens : null,
      candidate_count: run.object.candidates.length,
    },
  };
}

/**
 * Twee-staps Action Item extractie. Stage 1 (Haiku) spot brede kandidaten,
 * stage 2 (Sonnet) beoordeelt elke kandidaat los tegen de drie vragen.
 *
 * Voordeel: minder rationalisatie-ruis omdat stage 2 één kandidaat tegelijk
 * weegt in plaats van 30 turns voor 5 outputs te wegen. Kost ~2x latency en
 * tokens; bedoeld voor recall+precision-gevoelige use cases.
 */
export async function runActionItemSpecialistTwoStage(
  transcript: string,
  context: ActionItemSpecialistContext,
): Promise<ActionItemTwoStageRunResult> {
  const startedAt = Date.now();
  const contextPrefix = [
    `Titel: ${context.title}`,
    `Type: ${context.meeting_type}`,
    `Party: ${context.party_type}`,
    `Meetingdatum: ${context.meeting_date}`,
    `Deelnemers: ${context.participants.join(", ")}`,
  ].join("\n");

  // STAGE 1 — Candidate Spotter (delegeert aan standalone functie zodat de
  // tuning-harness die ook los kan aanroepen).
  const spotterResult = await runActionItemCandidateSpotter(transcript, context);
  const candidates = spotterResult.candidates;
  const stage1Latency = spotterResult.metrics.latency_ms;
  const stage1Usage = {
    inputTokens: spotterResult.metrics.input_tokens ?? undefined,
    outputTokens: spotterResult.metrics.output_tokens ?? undefined,
  };

  // STAGE 2 — Judge (Sonnet, strict)
  const stage2Started = Date.now();
  const candidateBlock = candidates
    .map((c, i) => `[${i + 1}] (${c.pattern_type}) ${c.speaker}: "${c.quote}"`)
    .join("\n");

  const stage2 = await withAgentRun(
    {
      agent_name: "action-item-judge",
      model: JUDGE_MODEL,
      prompt_version: "v1",
    },
    async () => {
      const res = await generateObject({
        model: anthropic(JUDGE_MODEL),
        maxRetries: 3,
        temperature: 0,
        // Sonnet 4.6 zonder extended thinking is meestal genoeg voor de drie
        // vragen-toets per kandidaat. Met effort=high kunnen reasoning-tokens
        // de response cap raken zodat JSON afkapt en parsen faalt. Tijdens
        // tuning bewust geen high-effort; herinschakelen kan later.
        maxOutputTokens: 32000,
        schema: ActionItemJudgementsSchema,
        messages: [
          {
            role: "system",
            content: loadJudgePrompt(),
            providerOptions: {
              anthropic: { cacheControl: { type: "ephemeral" } },
            },
          },
          {
            role: "user",
            content: `${contextPrefix}\n\n--- TRANSCRIPT ---\n${transcript}\n\n--- KANDIDATEN ---\n${candidateBlock}`,
          },
        ],
      });
      return { result: { object: res.object, usage: res.usage }, usage: res.usage };
    },
  );
  const stage2Latency = Date.now() - stage2Started;

  const { accepts: acceptedItems, rejects: rejectedItems } = stage2.object;

  // Clamp confidence en map naar RawActionItemSpecialistOutput
  const acceptedRaw: RawActionItemSpecialistOutput = {
    items: acceptedItems.map((j) => ({
      content: j.content,
      follow_up_contact: j.follow_up_contact,
      assignee: j.assignee,
      source_quote: j.source_quote,
      project_context: j.project_context,
      deadline: j.deadline,
      type_werk: j.type_werk,
      category: j.category,
      confidence: Math.max(0, Math.min(1, j.confidence)),
      reasoning: j.reasoning,
    })),
  };

  // Verenigde judgements view voor UI: één lijst, gesorteerd op candidate-index
  const judgements: ActionItemJudgement[] = [
    ...acceptedItems.map((a) => ({
      candidate_index: a.candidate_index,
      decision: "accept" as const,
      accepted: a,
    })),
    ...rejectedItems.map((r) => ({
      candidate_index: r.candidate_index,
      decision: "reject" as const,
      rejection_reason: r.rejection_reason,
    })),
  ].sort((a, b) => a.candidate_index - b.candidate_index);

  const accepts = acceptedItems.length;
  const rejects = rejectedItems.length;

  return {
    output: normaliseActionItemSpecialistOutput(acceptedRaw),
    candidates,
    judgements,
    metrics: {
      spotter: {
        latency_ms: stage1Latency,
        input_tokens: stage1Usage.inputTokens ?? null,
        output_tokens: stage1Usage.outputTokens ?? null,
        candidate_count: candidates.length,
      },
      judge: {
        latency_ms: stage2Latency,
        input_tokens:
          typeof stage2.usage?.inputTokens === "number" ? stage2.usage.inputTokens : null,
        output_tokens:
          typeof stage2.usage?.outputTokens === "number" ? stage2.usage.outputTokens : null,
        reasoning_tokens:
          typeof stage2.usage?.reasoningTokens === "number" ? stage2.usage.reasoningTokens : null,
        accept_count: accepts,
        reject_count: rejects,
      },
      total_latency_ms: Date.now() - startedAt,
    },
  };
}

export function getActionItemCandidateSpotterPrompt(): string {
  return loadCandidateSpotterPrompt();
}

export function getActionItemJudgePrompt(): string {
  return loadJudgePrompt();
}
