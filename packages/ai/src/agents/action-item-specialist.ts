import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  ActionItemSpecialistRawOutputSchema,
  type ActionItemFollowupAction,
  type ActionItemRecipientPerQuote,
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
import {
  ActionItemActionValidatorOutputSchema,
  type ActionItemActionValidatorOutput,
} from "../validations/action-item-action-validator";
import { emptyToNull, sentinelToNull } from "../utils/normalise";
import { resolveFollowUpDate } from "./action-item-follow-up";
import { withAgentRun } from "./run-logger";

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

export type ActionItemPromptVersion = "v2" | "v3" | "v4" | "v5";

export const ACTION_ITEM_SPECIALIST_DEFAULT_PROMPT_VERSION: ActionItemPromptVersion = "v2";
export const ACTION_ITEM_SPECIALIST_MODEL = "claude-sonnet-4-6";

/** @deprecated gebruik ACTION_ITEM_SPECIALIST_DEFAULT_PROMPT_VERSION of geef
 *  promptVersion expliciet mee aan runActionItemSpecialist. */
export const ACTION_ITEM_SPECIALIST_PROMPT_VERSION = ACTION_ITEM_SPECIALIST_DEFAULT_PROMPT_VERSION;

const PROMPT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../prompts");

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

export interface ActionItemSpecialistParticipant {
  name: string;
  /** Functie binnen organisatie (bv. "CEO", "lead developer"). Mag null. */
  role: string | null;
  /** Naam van de organisatie (bv. "JAIP", "Acme BV"). Mag null. */
  organization: string | null;
  /** Type organisatie (bv. "internal", "client", "partner"). Mag null. */
  organization_type: string | null;
}

export interface ActionItemSpecialistContext {
  title: string;
  meeting_type: string;
  party_type: string;
  meeting_date: string;
  participants: ActionItemSpecialistParticipant[];
}

/** Render één participant-regel: "Stef (JAIP, CEO)" of "Sandra (Acme BV — client)".
 *  Houdt het compact maar toont alle info die ContextPrefix anders mist. */
function formatParticipantLine(p: ActionItemSpecialistParticipant): string {
  const orgPart = p.organization
    ? p.organization_type
      ? `${p.organization} — ${p.organization_type}`
      : p.organization
    : null;
  const meta = [orgPart, p.role].filter(Boolean).join(", ");
  return meta ? `${p.name} (${meta})` : p.name;
}

function formatParticipantBlock(participants: ActionItemSpecialistParticipant[]): string {
  if (participants.length === 0) return "Deelnemers: (geen geregistreerd)";
  return ["Deelnemers:", ...participants.map((p) => `- ${formatParticipantLine(p)}`)].join("\n");
}

export interface ActionItemSpecialistRunOptions {
  /** Welke promptversie gebruiken. Default v2. */
  promptVersion?: ActionItemPromptVersion;
  /** Stage 3 action-validator aan: voor élk type C/D-accept met
   *  jaip_followup_action: productive draait een Haiku-validator die
   *  de classificatie cross-checkt. Bij verdict consumptive wordt het
   *  item naar gated[] verplaatst. Default true tijdens harness-tuning. */
  validateAction?: boolean;
}

export interface ActionItemSpecialistRunMetrics {
  latency_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  reasoning_tokens: number | null;
}

export interface ActionItemGatedItem {
  item: ActionItemSpecialistItem;
  reason: string;
  /** Aanwezig wanneer het item via de stage-3 validator-call is gedowngrade
   *  (niet via de mechanische gate). */
  validator?: { verdict: "consumptive"; reason: string };
}

export interface ActionItemSpecialistRunResult {
  output: ActionItemSpecialistOutput;
  /** Items die het model wilde accepteren maar door de mechanische gate
   *  zijn gedowngrade (type C/D zonder valide grounding). Bedoeld voor de
   *  harness-UI zodat false-positive-rationalisaties zichtbaar blijven. */
  gated: ActionItemGatedItem[];
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
    formatParticipantBlock(context.participants),
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

/**
 * Past de follow-up-resolver toe op een lijst items: bij gevulde deadline
 * wordt `follow_up_date` deterministisch overschreven (type A = deadline,
 * type B/C/D = deadline − 1 werkdag, met floor > meetingdatum). Bij lege
 * deadline blijft de AI-extracted waarde staan, mits ná meeting.
 */
function applyFollowUpResolver(items: ActionItemSpecialistItem[], meetingDate: string): void {
  for (const item of items) {
    item.follow_up_date = resolveFollowUpDate({
      deadline: item.deadline,
      aiFollowUp: item.follow_up_date,
      typeWerk: item.type_werk,
      meetingDate,
    });
  }
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
        follow_up_date: emptyToNull(r.follow_up_date),
        type_werk: r.type_werk,
        category: sentinelToNull(r.category) as
          | "wachten_op_extern"
          | "wachten_op_beslissing"
          | null,
        confidence: r.confidence,
        reasoning: emptyToNull(r.reasoning),
        recipient_per_quote: r.recipient_per_quote,
        jaip_followup_quote: emptyToNull(r.jaip_followup_quote),
        jaip_followup_action: r.jaip_followup_action,
      }),
    ),
  };
}

/**
 * Mechanische gate voor type C/D items.
 *
 * Het model krijgt twee verplichte velden (recipient_per_quote en
 * jaip_followup_quote) waar het de feiten zelf moet benoemen voordat het
 * accept kan zeggen. Deze functie controleert die feiten in code, los van
 * de prompt — geen ruimte voor rationalisatie via taal.
 *
 * Type A (intern) en B (JAIP levert) gaan altijd door — de gate geldt
 * alleen voor type C en D waar het rationalisatie-probleem zit.
 *
 * Returns: null als gate passes (item mag door), string met reden als gate
 * faalt (item moet downgraden naar reject).
 */
export function checkActionItemGate(item: {
  type_werk: "A" | "B" | "C" | "D";
  recipient_per_quote: ActionItemRecipientPerQuote;
  jaip_followup_quote: string;
  jaip_followup_action: ActionItemFollowupAction;
}): string | null {
  if (item.type_werk !== "C" && item.type_werk !== "D") return null;
  if (item.recipient_per_quote !== "stef_wouter") {
    return `auto-gate: recipient_per_quote=${item.recipient_per_quote} (vereist stef_wouter voor type ${item.type_werk})`;
  }
  if (!item.jaip_followup_quote.trim()) {
    return `auto-gate: jaip_followup_quote leeg (geen citaat van JAIP-vervolgstap gevonden voor type ${item.type_werk})`;
  }
  if (item.jaip_followup_action !== "productive") {
    return `auto-gate: jaip_followup_action=${item.jaip_followup_action} (vereist productive voor type ${item.type_werk}; consumptief vervolg = niet trackbaar als wachtende JAIP-deliverable)`;
  }
  return null;
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

export interface ActionItemTwoStageRunOptions {
  /** Stage 3 action-validator aan: voor élk type C/D-accept met
   *  jaip_followup_action: productive draait een Haiku-validator die de
   *  classificatie cross-checkt. Bij verdict consumptive wordt het item
   *  van accepts naar rejects verplaatst. Default true. */
  validateAction?: boolean;
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
    formatParticipantBlock(context.participants),
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
  options: ActionItemTwoStageRunOptions = {},
): Promise<ActionItemTwoStageRunResult> {
  const startedAt = Date.now();
  const contextPrefix = [
    `Titel: ${context.title}`,
    `Type: ${context.meeting_type}`,
    `Party: ${context.party_type}`,
    `Meetingdatum: ${context.meeting_date}`,
    formatParticipantBlock(context.participants),
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

  // Mechanische gate: splits accepts in echt-passes en gate-failures.
  // Gate-failures worden naar rejects verplaatst met expliciete reason zodat
  // de harness ze in het judgements-panel kan tonen ipv ze stilletjes te
  // verbergen. Type A/B passeren altijd (gate geldt alleen voor C/D).
  const acceptedAfterGate: typeof acceptedItems = [];
  const gateRejected: { candidate_index: number; rejection_reason: string }[] = [];
  for (const item of acceptedItems) {
    const reason = checkActionItemGate({
      type_werk: item.type_werk,
      recipient_per_quote: item.recipient_per_quote,
      jaip_followup_quote: item.jaip_followup_quote,
      jaip_followup_action: item.jaip_followup_action,
    });
    if (reason) {
      gateRejected.push({ candidate_index: item.candidate_index, rejection_reason: reason });
    } else {
      acceptedAfterGate.push(item);
    }
  }

  // Stage 3 validator: voor elk type C/D-accept met jaip_followup_action:
  // productive checkt een Haiku-validator of die classificatie klopt.
  // Default aan; uit te zetten via options.validateAction = false.
  const shouldValidate = options.validateAction ?? true;
  const acceptedAfterValidator: typeof acceptedAfterGate = [];
  const validatorRejected: { candidate_index: number; rejection_reason: string }[] = [];
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

// ============================================================================
// STAGE 3 — ACTION VALIDATOR
// ============================================================================

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

/**
 * Pakt ±N turns rond de eerste match van de quote in het transcript.
 * Als de quote niet wordt gevonden, valt terug op de hele transcript
 * (afgekapt op 4000 chars zodat de validator niet in een 30k-input
 * verdrinkt). De validator hoeft niet het hele transcript te zien —
 * alleen genoeg context om productive/consumptive te beoordelen.
 */
export function extractTranscriptContext(
  transcript: string,
  quote: string,
  surroundingChars = 1500,
): string {
  if (!quote.trim()) return transcript.slice(0, 4000);
  const idx = transcript.indexOf(quote);
  if (idx < 0) {
    // Fuzzy fallback — eerste 6 woorden van quote
    const firstWords = quote.trim().split(/\s+/).slice(0, 6).join(" ");
    const fuzzyIdx = transcript.indexOf(firstWords);
    if (fuzzyIdx < 0) return transcript.slice(0, 4000);
    return sliceAround(transcript, fuzzyIdx, surroundingChars);
  }
  return sliceAround(transcript, idx, surroundingChars);
}

function sliceAround(transcript: string, idx: number, surroundingChars: number): string {
  const start = Math.max(0, idx - surroundingChars);
  const end = Math.min(transcript.length, idx + surroundingChars);
  return (
    (start > 0 ? "...\n" : "") +
    transcript.slice(start, end) +
    (end < transcript.length ? "\n..." : "")
  );
}
