"use server";

import { z } from "zod";
import { requireAdminInAction } from "@repo/auth/access";
import { getMeetingForGoldenCoder, getGoldenForMeeting } from "@repo/database/queries/golden";
import {
  runActionItemSpecialist,
  ACTION_ITEM_SPECIALIST_MODEL,
  ACTION_ITEM_SPECIALIST_DEFAULT_PROMPT_VERSION,
  getActionItemSpecialistSystemPrompt,
  type ActionItemPromptVersion,
} from "@repo/ai/agents/action-item-specialist";
import {
  comparePrecisionRecall,
  type ComparisonResult,
  type ComparableItem,
} from "@repo/ai/lib/golden-comparison";
import type { ActionItemSpecialistItem } from "@repo/ai/validations/action-item-specialist";

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
  // Optioneel: alleen items met confidence ≥ threshold worden vergeleken.
  // Default 0 = alle items meenemen. Stelt prompt-tuners in staat om
  // confidence-cutoff te variëren zonder code-change.
  confidenceThreshold: z.number().min(0).max(1).default(0),
  contentThreshold: z.number().min(0).max(1).default(0.55),
  // Welke promptversie testen. Default v2 (production prompt). v3 = nieuwe
  // drie-vragen-model die parallel naast v2 draait voor vergelijking.
  promptVersion: z.enum(["v2", "v3"]).default(ACTION_ITEM_SPECIALIST_DEFAULT_PROMPT_VERSION),
});

export type RunActionItemAgentInput = z.input<typeof runSchema>;

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
    promptVersion: string;
    items: ActionItemSpecialistItem[];
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

  // Run agent
  let runResult: Awaited<ReturnType<typeof runActionItemSpecialist>>;
  try {
    runResult = await runActionItemSpecialist(
      meeting.transcript,
      {
        title: meeting.title,
        meeting_type: meeting.meeting_type ?? "team_sync",
        party_type: meeting.party_type ?? "internal",
        meeting_date: meeting.date ?? new Date().toISOString().slice(0, 10),
        participants: meeting.participants.map((p) => p.name),
      },
      { promptVersion },
    );
  } catch (err) {
    return { error: `Agent crashte: ${err instanceof Error ? err.message : String(err)}` };
  }

  // Filter on confidence threshold (post-agent, omdat de agent zijn eigen
  // prompt-cutoff van 0.4 al toepast — deze threshold is een verdere
  // harness-zijdige knop voor experimenteren).
  const filteredItems = runResult.output.items.filter(
    (i) => i.confidence >= parsed.data.confidenceThreshold,
  );

  // Map naar ComparableItem voor de comparison helper. reasoning + confidence
  // gaan mee zodat de tuning-UI ze kan tonen op false positives en matches.
  const extractedComparable: ComparableItem[] = filteredItems.map((i) => ({
    content: i.content,
    follow_up_contact: i.follow_up_contact,
    type_werk: i.type_werk,
    deadline: i.deadline,
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
      promptVersion,
      items: filteredItems,
      metrics: runResult.metrics,
    },
    golden: {
      item_count: golden.items.length,
      encoded_at: golden.state.encoded_at,
    },
    comparison,
    systemPrompt: getActionItemSpecialistSystemPrompt(promptVersion),
  };
}
