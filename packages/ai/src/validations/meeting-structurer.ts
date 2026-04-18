import { z } from "zod";
import { ParticipantProfileSchema } from "./summarizer";
import { ALL_EXTRACTION_TYPES } from "../extraction-types";

/**
 * Per-type metadata schemas. Kept loose (`.partial()` semantics via optional)
 * so the agent can still produce a valid object when a field is hard to
 * determine from the transcript. Strictness lives in the prompt.
 */

const ActionItemMetadata = z.object({
  category: z.enum(["wachten_op_extern", "wachten_op_beslissing"]).nullable().optional(),
  follow_up_contact: z.string().nullable().optional(),
  assignee: z.string().nullable().optional(),
  deadline: z.string().nullable().optional().describe("ISO date YYYY-MM-DD if explicit"),
  suggested_deadline: z
    .string()
    .nullable()
    .optional()
    .describe("ISO date YYYY-MM-DD when no explicit"),
  effort_estimate: z.enum(["small", "medium", "large"]).nullable().optional(),
  deadline_reasoning: z.string().nullable().optional(),
  scope: z.enum(["project", "personal"]).nullable().optional(),
});

const DecisionMetadata = z.object({
  status: z.enum(["open", "closed"]).nullable().optional(),
  decided_by: z.string().nullable().optional(),
  impact_area: z
    .enum(["pricing", "scope", "technical", "hiring", "process", "other"])
    .nullable()
    .optional(),
});

const RiskMetadata = z.object({
  severity: z.enum(["low", "medium", "high", "critical"]).nullable().optional(),
  category: z
    .enum(["financial", "scope", "technical", "client_relationship", "team", "timeline"])
    .nullable()
    .optional(),
});

const NeedMetadata = z.object({
  party: z.enum(["client", "team", "partner"]).nullable().optional(),
  urgency: z.enum(["nice_to_have", "should_have", "must_have"]).nullable().optional(),
  category: z
    .enum(["tooling", "knowledge", "capacity", "process", "client", "other"])
    .nullable()
    .optional(),
});

const CommitmentMetadata = z.object({
  committer: z.string().nullable().optional(),
  committed_to: z.string().nullable().optional(),
  direction: z.enum(["outgoing", "incoming"]).nullable().optional(),
});

const QuestionMetadata = z.object({
  needs_answer_from: z.string().nullable().optional(),
  urgency: z.enum(["low", "medium", "high"]).nullable().optional(),
});

const SignalMetadata = z.object({
  direction: z.enum(["positive", "neutral", "concerning"]).nullable().optional(),
  domain: z.enum(["market", "client", "team", "technical"]).nullable().optional(),
});

const ContextMetadata = z.object({
  about_person: z.string().nullable().optional(),
  about_org: z.string().nullable().optional(),
  domain: z
    .enum(["methodology", "background", "expertise", "process", "preferences", "personal"])
    .nullable()
    .optional(),
  sensitive: z.boolean().nullable().optional(),
});

const VisionMetadata = z.object({
  horizon: z.enum(["short_term", "long_term"]).nullable().optional(),
});

// Tier-2 metadata schemas — small, best-effort.
const IdeaMetadata = z.object({
  proposed_by: z.string().nullable().optional(),
});

const InsightMetadata = z.object({
  scope: z.enum(["meeting", "project", "team", "company"]).nullable().optional(),
});

const ClientSentimentMetadata = z.object({
  sentiment: z.enum(["positive", "neutral", "concerning"]).nullable().optional(),
  about: z.string().nullable().optional(),
});

const PricingSignalMetadata = z.object({
  signal_type: z
    .enum(["budget_constraint", "willingness_to_pay", "comparison", "request"])
    .nullable()
    .optional(),
  amount_hint: z.string().nullable().optional(),
});

const MilestoneMetadata = z.object({
  status: z.enum(["upcoming", "reached", "missed"]).nullable().optional(),
  date_hint: z.string().nullable().optional(),
});

export const TYPE_METADATA_SCHEMAS = {
  action_item: ActionItemMetadata,
  decision: DecisionMetadata,
  risk: RiskMetadata,
  need: NeedMetadata,
  commitment: CommitmentMetadata,
  question: QuestionMetadata,
  signal: SignalMetadata,
  context: ContextMetadata,
  vision: VisionMetadata,
  idea: IdeaMetadata,
  insight: InsightMetadata,
  client_sentiment: ClientSentimentMetadata,
  pricing_signal: PricingSignalMetadata,
  milestone: MilestoneMetadata,
} as const;

/**
 * Common shape for every kernpunt regardless of type. Per-type metadata
 * lives in the `metadata` jsonb field — kept as a permissive record so a
 * single Zod schema can be passed to `generateObject` without a
 * 14-arm discriminated union (which Anthropic's structured-output
 * support handles poorly).
 */
export const KernpuntSchema = z.object({
  type: z.enum(ALL_EXTRACTION_TYPES),
  content: z.string().describe("Concise Dutch sentence describing this item (max 30 words)"),
  theme: z
    .string()
    .nullable()
    .describe(
      "Short theme name this item belongs to (max 4-5 words). Multiple items in the same meeting can share a theme.",
    ),
  theme_project: z
    .string()
    .nullable()
    .describe(
      "Project name for this theme — must match a known project name exactly, or 'Algemeen' for non-project items. Null if unknown.",
    ),
  source_quote: z
    .string()
    .nullable()
    .describe("Exact quote from the transcript supporting this extraction. Null if not available."),
  project: z
    .string()
    .nullable()
    .describe("Project name this item belongs to. Null when not project-specific."),
  confidence: z
    .number()
    .describe("0-1 confidence. Below 0.5 means the agent is unsure — UI may filter."),
  // Metadata is a loose object — per-type validation happens on our side
  // via `validateKernpuntMetadata`. Using `z.object({}).catchall(z.unknown())`
  // instead of `z.record(z.string(), z.unknown())` because the latter emits
  // `propertyNames` in JSON Schema, which Anthropic's structured-output
  // endpoint rejects with "property 'propertyNames' is not supported".
  metadata: z
    .object({})
    .catchall(z.unknown())
    .describe("Type-specific metadata. Shape depends on type — see TYPE_METADATA_SCHEMAS."),
});

export const EntitiesSchema = z.object({
  clients: z.array(z.string()).describe("Client/external organization names mentioned"),
  people: z.array(z.string()).describe("Person names mentioned (excluding speakers)"),
});

export const MeetingStructurerOutputSchema = z.object({
  briefing: z
    .string()
    .describe("3-5 sentence narrative summary, past tense, informal but professional."),
  kernpunten: z.array(KernpuntSchema),
  deelnemers: z.array(ParticipantProfileSchema),
  entities: EntitiesSchema,
});

export type Kernpunt = z.infer<typeof KernpuntSchema>;
export type MeetingStructurerOutput = z.infer<typeof MeetingStructurerOutputSchema>;

/**
 * Validate that a kernpunt's metadata matches its type-specific schema.
 * Returns parsed metadata on success, or an error message string.
 *
 * Useful in `save-extractions.ts` (next step) and the harness to verify
 * the agent emitted the right shape per type before persisting.
 */
export function validateKernpuntMetadata(
  k: Pick<Kernpunt, "type" | "metadata">,
): { ok: true; metadata: Record<string, unknown> } | { ok: false; error: string } {
  const schema = TYPE_METADATA_SCHEMAS[k.type];
  const result = schema.safeParse(k.metadata);
  if (!result.success) {
    return { ok: false, error: result.error.issues.map((i) => i.message).join("; ") };
  }
  return { ok: true, metadata: result.data as Record<string, unknown> };
}
