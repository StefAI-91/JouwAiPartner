import { z } from "zod";
import { ALL_EXTRACTION_TYPES, type ExtractionType } from "../extraction-types";

/**
 * Participant profile voor MeetingStructurer. Alle velden zijn required
 * strings met "" als sentinel — de legacy `ParticipantProfileSchema` uit
 * summarizer.ts gebruikt nullable, maar Anthropic's structured-output
 * endpoint heeft een limiet van 16 union-typed parameters over het
 * hele schema heen. Deze variant houdt 0 unions.
 */
export const MeetingStructurerParticipantSchema = z.object({
  name: z.string().describe("Naam of speaker-label van de deelnemer"),
  role: z.string().describe("Rol of functie. Lege string als onbekend."),
  organization: z.string().describe("Organisatie. Lege string als onbekend."),
  stance: z
    .string()
    .describe(
      "Houding/positie in het gesprek ('enthousiast', 'kritisch', 'afwachtend'). Lege string als onduidelijk.",
    ),
});

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
    .enum([
      "financial",
      "scope",
      "technical",
      "client_relationship",
      "team",
      "timeline",
      "strategic",
      "reputation",
    ])
    .nullable()
    .optional(),
  jaip_impact_area: z
    .enum(["delivery", "margin", "strategy", "client", "team", "reputation"])
    .nullable()
    .optional(),
  raised_by: z.string().nullable().optional(),
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
    .describe(
      "Short theme name this item belongs to (max 4-5 words). Multiple items in the same meeting can share a theme. Empty string if unknown.",
    ),
  theme_project: z
    .string()
    .describe(
      "Project name for this theme — must match a known project name exactly, or 'Algemeen' for non-project items. Empty string if unknown.",
    ),
  source_quote: z
    .string()
    .describe(
      "Exact quote from the transcript supporting this extraction. Empty string if not available.",
    ),
  project: z
    .string()
    .describe("Project name this item belongs to. Empty string when not project-specific."),
  confidence: z
    .number()
    .describe("0-1 confidence. Below 0.5 means the agent is unsure — UI may filter."),
  // Universal metadata schema: alle velden als REQUIRED (zonder nullable/optional)
  // om onder Anthropic's limiet van 16 union-typed parameters te blijven.
  // Sentinel-conventie: lege string "" of enum-waarde "n/a" = veld niet van
  // toepassing voor dit type. Downstream code normaliseert sentinel → null
  // voor DB/UI-consumptie.
  metadata: z
    .object({
      // --- Enum-velden uniek per type (inclusief "n/a" sentinel) ---
      effort_estimate: z.enum(["small", "medium", "large", "n/a"]),
      impact_area: z.enum(["pricing", "scope", "technical", "hiring", "process", "other", "n/a"]),
      severity: z.enum(["low", "medium", "high", "critical", "n/a"]),
      jaip_impact_area: z.enum([
        "delivery",
        "margin",
        "strategy",
        "client",
        "team",
        "reputation",
        "n/a",
      ]),
      party: z.enum(["client", "team", "partner", "n/a"]),
      horizon: z.enum(["short_term", "long_term", "n/a"]),
      sentiment: z.enum(["positive", "neutral", "concerning", "n/a"]),
      signal_type: z.enum([
        "budget_constraint",
        "willingness_to_pay",
        "comparison",
        "request",
        "n/a",
      ]),
      sensitive: z.boolean(),

      // --- Enum-velden met overlap tussen types (prompt bepaalt semantiek
      //     per type; save-layer valideert via TYPE_METADATA_SCHEMAS) ---
      category: z.enum([
        "wachten_op_extern",
        "wachten_op_beslissing",
        "financial",
        "scope",
        "technical",
        "client_relationship",
        "team",
        "timeline",
        "strategic",
        "reputation",
        "tooling",
        "knowledge",
        "capacity",
        "process",
        "client",
        "other",
        "n/a",
      ]),
      scope: z.enum(["project", "personal", "meeting", "team", "company", "n/a"]),
      status: z.enum(["open", "closed", "upcoming", "reached", "missed", "n/a"]),
      urgency: z.enum(["nice_to_have", "should_have", "must_have", "low", "medium", "high", "n/a"]),
      direction: z.enum(["outgoing", "incoming", "positive", "neutral", "concerning", "n/a"]),
      domain: z.enum([
        "market",
        "client",
        "team",
        "technical",
        "methodology",
        "background",
        "expertise",
        "process",
        "preferences",
        "personal",
        "n/a",
      ]),

      // --- Vrije-tekst velden (lege string = niet van toepassing) ---
      follow_up_contact: z.string(),
      assignee: z.string(),
      deadline: z.string(),
      decided_by: z.string(),
      raised_by: z.string(),
      committer: z.string(),
      committed_to: z.string(),
      needs_answer_from: z.string(),
    })
    .describe(
      "Per-type metadata. Vul de velden die bij het item-type horen met de juiste waarde. Voor velden die niet bij dit type horen: gebruik 'n/a' (enums) of '' (strings).",
    ),
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
  deelnemers: z.array(MeetingStructurerParticipantSchema),
  entities: EntitiesSchema,
});

/**
 * Publieke types: bewust losser dan de raw Zod-schema. De agent gebruikt
 * required strings + "n/a" enum-sentinels om onder Anthropic's 16-union
 * limiet te blijven, maar downstream (save, render, UI) verwacht
 * `string | null` / optionele metadata-velden. De agent normaliseert de
 * raw output (sentinel "" / "n/a" → null) vóór hij Kernpunt[] retourneert.
 */
export type Kernpunt = {
  type: ExtractionType;
  content: string;
  theme: string | null;
  theme_project: string | null;
  source_quote: string | null;
  project: string | null;
  confidence: number;
  metadata: {
    effort_estimate?: "small" | "medium" | "large" | null;
    impact_area?: "pricing" | "scope" | "technical" | "hiring" | "process" | "other" | null;
    severity?: "low" | "medium" | "high" | "critical" | null;
    jaip_impact_area?: "delivery" | "margin" | "strategy" | "client" | "team" | "reputation" | null;
    party?: "client" | "team" | "partner" | null;
    horizon?: "short_term" | "long_term" | null;
    sentiment?: "positive" | "neutral" | "concerning" | null;
    signal_type?: "budget_constraint" | "willingness_to_pay" | "comparison" | "request" | null;
    sensitive?: boolean | null;
    category?: string | null;
    scope?: string | null;
    status?: string | null;
    urgency?: string | null;
    direction?: string | null;
    domain?: string | null;
    follow_up_contact?: string | null;
    assignee?: string | null;
    deadline?: string | null;
    decided_by?: string | null;
    raised_by?: string | null;
    committer?: string | null;
    committed_to?: string | null;
    needs_answer_from?: string | null;
    theme?: string | null;
    theme_project?: string | null;
    project?: string | null;
  };
};

export type MeetingStructurerParticipant = {
  name: string;
  role: string | null;
  organization: string | null;
  stance: string | null;
};

export type MeetingStructurerOutput = {
  briefing: string;
  kernpunten: Kernpunt[];
  deelnemers: MeetingStructurerParticipant[];
  entities: { clients: string[]; people: string[] };
};

/** Raw (pre-normalisatie) output zoals direct uit Anthropic — intern gebruik. */
export type RawMeetingStructurerOutput = z.infer<typeof MeetingStructurerOutputSchema>;

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
