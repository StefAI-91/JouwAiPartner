import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { type RawActionItemSpecialistOutput } from "../../validations/action-item-specialist";
import {
  ActionItemCandidatesSchema,
  ActionItemJudgementsSchema,
  type ActionItemAccepted,
  type ActionItemCandidate,
  type ActionItemJudgement,
} from "../../validations/action-item-two-stage";
import { emptyToNull } from "../../utils/normalise";
import { withAgentRun } from "../run-logger";
import { resolveFollowUpDate } from "../action-item-follow-up";
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
  ActionItemSpecialistContext,
  ActionItemSpotterRunResult,
  ActionItemTwoStageRunOptions,
  ActionItemTwoStageRunResult,
} from "./types";

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

interface JudgeStageResult {
  accepts: ActionItemAccepted[];
  rejects: { candidate_index: number; rejection_reason: string }[];
  latency_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  reasoning_tokens: number | null;
}

// Sonnet 4.6 zonder extended thinking is meestal genoeg voor de drie
// vragen-toets per kandidaat. Met effort=high kunnen reasoning-tokens de
// response cap raken zodat JSON afkapt en parsen faalt — bewust uit.
async function runJudgeStage(
  transcript: string,
  contextPrefix: string,
  candidates: ActionItemCandidate[],
): Promise<JudgeStageResult> {
  const started = Date.now();
  const candidateBlock = candidates
    .map((c, i) => `[${i + 1}] (${c.pattern_type}) ${c.speaker}: "${c.quote}"`)
    .join("\n");

  const run = await withAgentRun(
    { agent_name: "action-item-judge", model: JUDGE_MODEL, prompt_version: "v1" },
    async () => {
      const res = await generateObject({
        model: anthropic(JUDGE_MODEL),
        maxRetries: 3,
        temperature: 0,
        maxOutputTokens: 32000,
        schema: ActionItemJudgementsSchema,
        messages: [
          {
            role: "system",
            content: loadJudgePrompt(),
            providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
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

  return {
    accepts: run.object.accepts,
    rejects: run.object.rejects,
    latency_ms: Date.now() - started,
    input_tokens: typeof run.usage?.inputTokens === "number" ? run.usage.inputTokens : null,
    output_tokens: typeof run.usage?.outputTokens === "number" ? run.usage.outputTokens : null,
    reasoning_tokens:
      typeof run.usage?.reasoningTokens === "number" ? run.usage.reasoningTokens : null,
  };
}

type IndexedRejection = { candidate_index: number; rejection_reason: string };

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
  const contextPrefix = buildContextPrefix(context);

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
  options: ActionItemTwoStageRunOptions = {},
): Promise<ActionItemTwoStageRunResult> {
  const startedAt = Date.now();
  const contextPrefix = buildContextPrefix(context);

  // STAGE 1 — Candidate Spotter (delegeert aan standalone functie zodat de
  // tuning-harness die ook los kan aanroepen).
  const spotterResult = await runActionItemCandidateSpotter(transcript, context);
  const candidates = spotterResult.candidates;
  const stage1Latency = spotterResult.metrics.latency_ms;
  const stage1Usage = {
    inputTokens: spotterResult.metrics.input_tokens ?? undefined,
    outputTokens: spotterResult.metrics.output_tokens ?? undefined,
  };

  const stage2 = await runJudgeStage(transcript, contextPrefix, candidates);
  const stage2Latency = stage2.latency_ms;
  const { accepts: acceptedItems, rejects: rejectedItems } = stage2;

  // Mechanische gate (alleen type C/D), gevolgd door Haiku-validator op
  // C/D-productive items. Failures keren als expliciete rejections zodat de
  // harness-UI ze kan tonen ipv stilletjes verbergen.
  const acceptedAfterGate: ActionItemAccepted[] = [];
  const gateRejected: IndexedRejection[] = [];
  for (const item of acceptedItems) {
    const reason = checkActionItemGate(item);
    if (reason) {
      gateRejected.push({ candidate_index: item.candidate_index, rejection_reason: reason });
    } else {
      acceptedAfterGate.push(item);
    }
  }

  const shouldValidate = options.validateAction ?? true;
  const acceptedAfterValidator: ActionItemAccepted[] = [];
  const validatorRejected: IndexedRejection[] = [];
  if (shouldValidate) {
    const validations = await Promise.all(
      acceptedAfterGate.map(async (item) => {
        if (item.type_werk !== "C" && item.type_werk !== "D") return { item, validator: null };
        if (item.jaip_followup_action !== "productive") return { item, validator: null };
        try {
          const v = await validateFollowupAction({
            source_quote: item.source_quote,
            jaip_followup_quote: item.jaip_followup_quote,
            transcript_context: extractTranscriptContext(transcript, item.source_quote),
            participants: context.participants.map((p) => p.name),
          });
          return { item, validator: v };
        } catch (err) {
          // Fail-open: validator-crash mag geen items wegfilteren.
          console.error("[action-item-validator two-stage] crashed, item passes:", err);
          return { item, validator: null };
        }
      }),
    );
    for (const { item, validator } of validations) {
      if (validator && validator.verdict === "consumptive") {
        validatorRejected.push({
          candidate_index: item.candidate_index,
          rejection_reason: `validator-override: action herclassificeerd naar consumptive (${validator.reason})`,
        });
      } else {
        acceptedAfterValidator.push(item);
      }
    }
  } else {
    acceptedAfterValidator.push(...acceptedAfterGate);
  }

  // Resolver toepassen op de raw judge-output zodat zowel de UI-judgements
  // (die de raw accepted tonen) als de uiteindelijke output dezelfde
  // deterministische follow_up_date dragen.
  for (const item of acceptedAfterValidator) {
    const resolved = resolveFollowUpDate({
      deadline: emptyToNull(item.deadline),
      aiFollowUp: emptyToNull(item.follow_up_date),
      typeWerk: item.type_werk,
      meetingDate: context.meeting_date,
    });
    item.follow_up_date = resolved ?? "";
  }

  // Clamp confidence en map naar RawActionItemSpecialistOutput
  const acceptedRaw: RawActionItemSpecialistOutput = {
    items: acceptedAfterValidator.map((j) => ({
      content: j.content,
      follow_up_contact: j.follow_up_contact,
      assignee: j.assignee,
      source_quote: j.source_quote,
      project_context: j.project_context,
      deadline: j.deadline,
      follow_up_date: j.follow_up_date,
      type_werk: j.type_werk,
      category: j.category,
      confidence: Math.max(0, Math.min(1, j.confidence)),
      reasoning: j.reasoning,
      recipient_per_quote: j.recipient_per_quote,
      jaip_followup_quote: j.jaip_followup_quote,
      jaip_followup_action: j.jaip_followup_action,
    })),
  };

  // Verenigde judgements view voor UI: één lijst, gesorteerd op candidate-index
  const allRejects = [...rejectedItems, ...gateRejected, ...validatorRejected];
  const judgements: ActionItemJudgement[] = [
    ...acceptedAfterValidator.map((a) => ({
      candidate_index: a.candidate_index,
      decision: "accept" as const,
      accepted: a,
    })),
    ...allRejects.map((r) => ({
      candidate_index: r.candidate_index,
      decision: "reject" as const,
      rejection_reason: r.rejection_reason,
    })),
  ].sort((a, b) => a.candidate_index - b.candidate_index);

  const accepts = acceptedAfterValidator.length;
  const rejects = allRejects.length;

  const normalisedOutput = normaliseActionItemSpecialistOutput(acceptedRaw);
  applyFollowUpResolver(normalisedOutput.items, context.meeting_date);

  return {
    output: normalisedOutput,
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
        input_tokens: stage2.input_tokens,
        output_tokens: stage2.output_tokens,
        reasoning_tokens: stage2.reasoning_tokens,
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
