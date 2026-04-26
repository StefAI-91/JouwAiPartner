"use server";

import { z } from "zod";
import { requireAdminInAction } from "@repo/auth/access";
import { getMeetingForGoldenCoder, getGoldenForMeeting } from "@repo/database/queries/golden";
import {
  runActionItemSpecialist,
  runActionItemSpecialistTwoStage,
  runActionItemCandidateSpotter,
  ACTION_ITEM_SPECIALIST_MODEL,
  ACTION_ITEM_SPECIALIST_DEFAULT_PROMPT_VERSION,
  getActionItemSpecialistSystemPrompt,
  getActionItemCandidateSpotterPrompt,
  getActionItemJudgePrompt,
  type ActionItemPromptVersion,
  type ActionItemGatedItem,
} from "@repo/ai/agents/action-item-specialist";
import {
  comparePrecisionRecall,
  type ComparisonResult,
  type ComparableItem,
} from "@repo/ai/lib/golden-comparison";
import type { ActionItemSpecialistItem } from "@repo/ai/validations/action-item-specialist";
import type {
  ActionItemCandidate,
  ActionItemJudgement,
} from "@repo/ai/validations/action-item-two-stage";

/**
 * Server action voor de Action Item Specialist harness. Roept de agent aan
 * tegen een verified, gecodeerde meeting, vergelijkt met de golden dataset,
 * retourneert metrics + diff. Geen DB-writes voor extracties — dit is dry-run.
 *
 * agent_runs wordt WEL beschreven (door withAgentRun in de agent zelf), met
 * een dry_run-vlag in metadata zodat dashboards deze runs kunnen uitsluiten.
 */

const runSchema = z.object({
  meetingId: z.string().uuid(),
  confidenceThreshold: z.number().min(0).max(1).default(0),
  contentThreshold: z.number().min(0).max(1).default(0.55),
  // Welke promptversie testen (alleen relevant in single-mode).
  promptVersion: z
    .enum(["v2", "v3", "v4", "v5"])
    .default(ACTION_ITEM_SPECIALIST_DEFAULT_PROMPT_VERSION),
  // single = bestaande v2/v3/v4/v5 single-call. two-stage = candidate-spotter +
  // judge. spotter-only = alleen Haiku spotter (voor tuning van die prompt
  // zonder de judge-overhead).
  mode: z.enum(["single", "two-stage", "spotter-only"]).default("single"),
  // Stage 3 action-validator. Default true: voor elk type C/D-accept met
  // jaip_followup_action: productive draait een Haiku-validator die de
  // classificatie cross-checkt en bij consumptive het item downgrade.
  validateAction: z.boolean().default(true),
});

export type RunActionItemAgentInput = z.input<typeof runSchema>;

export interface TwoStageDebug {
  candidates: ActionItemCandidate[];
  judgements: ActionItemJudgement[];
  spotter_metrics: {
    latency_ms: number;
    input_tokens: number | null;
    output_tokens: number | null;
    candidate_count: number;
  };
  judge_metrics: {
    latency_ms: number;
    input_tokens: number | null;
    output_tokens: number | null;
    reasoning_tokens: number | null;
    accept_count: number;
    reject_count: number;
  };
  candidate_spotter_prompt: string;
  judge_prompt: string;
}

export interface RunActionItemAgentResult {
  meetingContext: {
    id: string;
    title: string;
    date: string | null;
    meeting_type: string | null;
    transcript_length: number;
  };
  agent: {
    model: string;
    mode: "single" | "two-stage" | "spotter-only";
    promptVersion: string;
    items: ActionItemSpecialistItem[];
    /** Items die het model wilde accepteren maar door de mechanische
     *  gate zijn gedowngrade (single-call mode). In two-stage staan
     *  gegate items in twoStage.judgements als rejects met "auto-gate:"
     *  reason. */
    gated?: ActionItemGatedItem[];
    metrics: {
      latency_ms: number;
      input_tokens: number | null;
      output_tokens: number | null;
      reasoning_tokens: number | null;
    };
  };
  golden: {
    item_count: number;
    encoded_at: string;
  };
  comparison: ComparisonResult;
  systemPrompt: string;
  /** Alleen gevuld bij mode = two-stage. */
  twoStage?: TwoStageDebug;
}

export async function runActionItemAgentAction(
  input: RunActionItemAgentInput,
): Promise<RunActionItemAgentResult | { error: string }> {
  const parsed = runSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const guard = await requireAdminInAction();
  if ("error" in guard) return { error: guard.error };

  const meeting = await getMeetingForGoldenCoder(parsed.data.meetingId);
  if (!meeting) return { error: "Meeting niet gevonden" };
  if (!meeting.transcript) return { error: "Meeting heeft geen transcript" };

  const golden = await getGoldenForMeeting(parsed.data.meetingId);
  if (!golden.state || golden.state.status !== "coded") {
    return { error: "Meeting is niet gecodeerd in golden dataset" };
  }

  const promptVersion: ActionItemPromptVersion = parsed.data.promptVersion;
  const mode = parsed.data.mode;

  // Run agent — single-call of two-stage
  const ctx = {
    title: meeting.title,
    meeting_type: meeting.meeting_type ?? "team_sync",
    party_type: meeting.party_type ?? "internal",
    meeting_date: meeting.date ?? new Date().toISOString().slice(0, 10),
    participants: meeting.participants.map((p) => p.name),
  };

  let items: ActionItemSpecialistItem[];
  let gatedItems: ActionItemGatedItem[] | undefined;
  let runMetrics: {
    latency_ms: number;
    input_tokens: number | null;
    output_tokens: number | null;
    reasoning_tokens: number | null;
  };
  let twoStageDebug: TwoStageDebug | undefined;

  try {
    if (mode === "two-stage") {
      const res = await runActionItemSpecialistTwoStage(meeting.transcript, ctx, {
        validateAction: parsed.data.validateAction,
      });
      items = res.output.items;
      runMetrics = {
        latency_ms: res.metrics.total_latency_ms,
        input_tokens:
          (res.metrics.spotter.input_tokens ?? 0) + (res.metrics.judge.input_tokens ?? 0) || null,
        output_tokens:
          (res.metrics.spotter.output_tokens ?? 0) + (res.metrics.judge.output_tokens ?? 0) || null,
        reasoning_tokens: res.metrics.judge.reasoning_tokens,
      };
      twoStageDebug = {
        candidates: res.candidates,
        judgements: res.judgements,
        spotter_metrics: res.metrics.spotter,
        judge_metrics: res.metrics.judge,
        candidate_spotter_prompt: getActionItemCandidateSpotterPrompt(),
        judge_prompt: getActionItemJudgePrompt(),
      };
    } else if (mode === "spotter-only") {
      const res = await runActionItemCandidateSpotter(meeting.transcript, ctx);
      items = []; // spotter-only kent geen action_items, alleen candidates
      runMetrics = {
        latency_ms: res.metrics.latency_ms,
        input_tokens: res.metrics.input_tokens,
        output_tokens: res.metrics.output_tokens,
        reasoning_tokens: null,
      };
      twoStageDebug = {
        candidates: res.candidates,
        judgements: [],
        spotter_metrics: res.metrics,
        judge_metrics: {
          latency_ms: 0,
          input_tokens: null,
          output_tokens: null,
          reasoning_tokens: null,
          accept_count: 0,
          reject_count: 0,
        },
        candidate_spotter_prompt: getActionItemCandidateSpotterPrompt(),
        judge_prompt: "",
      };
    } else {
      const res = await runActionItemSpecialist(meeting.transcript, ctx, {
        promptVersion,
        validateAction: parsed.data.validateAction,
      });
      items = res.output.items;
      gatedItems = res.gated;
      runMetrics = res.metrics;
    }
  } catch (err) {
    // AI SDK's NoObjectGeneratedError heeft text (raw model output) en cause
    // erbij. .text kan op err zelf OF op err.cause zitten — walk both.
    console.error("[dev-action-item-runner] agent crashed", err);
    const base = err instanceof Error ? err.message : String(err);
    const extractText = (e: unknown): string | undefined => {
      if (
        e &&
        typeof e === "object" &&
        "text" in e &&
        typeof (e as { text?: unknown }).text === "string"
      ) {
        return (e as { text: string }).text;
      }
      return undefined;
    };
    const text =
      extractText(err) ??
      (err && typeof err === "object" && "cause" in err
        ? extractText((err as { cause: unknown }).cause)
        : undefined);
    const causeMsg =
      err && typeof err === "object" && "cause" in err && err.cause instanceof Error
        ? err.cause.message
        : "";
    const extra = text ? `\nRaw model output (eerste 2000 chars):\n${text.slice(0, 2000)}` : "";
    return { error: `Agent crashte: ${base}${causeMsg ? ` (${causeMsg})` : ""}${extra}` };
  }

  const filteredItems = items.filter((i) => i.confidence >= parsed.data.confidenceThreshold);

  // Map naar ComparableItem voor de comparison helper. reasoning + confidence
  // gaan mee zodat de tuning-UI ze kan tonen op false positives en matches.
  const extractedComparable: ComparableItem[] = filteredItems.map((i) => ({
    content: i.content,
    follow_up_contact: i.follow_up_contact,
    type_werk: i.type_werk,
    deadline: i.deadline,
    follow_up_date: i.follow_up_date,
    source_quote: i.source_quote,
    category: i.category,
    reasoning: i.reasoning,
    confidence: i.confidence,
  }));

  const goldenComparable: ComparableItem[] = golden.items.map((i) => ({
    id: i.id,
    content: i.content,
    follow_up_contact: i.follow_up_contact,
    type_werk: i.type_werk,
    deadline: i.deadline,
    source_quote: i.source_quote,
    category: i.category,
  }));

  const comparison = comparePrecisionRecall(extractedComparable, goldenComparable, {
    contentThreshold: parsed.data.contentThreshold,
  });

  return {
    meetingContext: {
      id: meeting.id,
      title: meeting.title,
      date: meeting.date,
      meeting_type: meeting.meeting_type,
      transcript_length: meeting.transcript.length,
    },
    agent: {
      model: ACTION_ITEM_SPECIALIST_MODEL,
      mode,
      promptVersion,
      items: filteredItems,
      gated: gatedItems,
      metrics: runMetrics,
    },
    golden: {
      item_count: golden.items.length,
      encoded_at: golden.state.encoded_at,
    },
    comparison,
    systemPrompt: getActionItemSpecialistSystemPrompt(promptVersion),
    twoStage: twoStageDebug,
  };
}
