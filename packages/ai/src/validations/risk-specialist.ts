import { z } from "zod";

/**
 * RiskSpecialist output schema. Bewust losser dan MeetingStructurer's
 * universele metadata: per-type specialist heeft GEEN 16-union limiet
 * probleem (maar 4 enum-velden). We houden sentinels identiek aan
 * MeetingStructurer om consistent JSON schema te emitteren, maar zonder
 * de gedeelde category/scope/status/etc. velden die bij een risk-only
 * agent niets toevoegen.
 *
 * Raw schema: alle velden REQUIRED (Anthropic structured-output werkt
 * beter met strict schema's — minder undefined-edge-cases). Sentinels
 * "n/a" (enums) en "" (strings) = veld niet bepaald; downstream
 * normaliseert naar null voor DB-opslag.
 */
export const RiskSpecialistRawItemSchema = z.object({
  content: z.string().describe("Concise Dutch sentence (max 30 words) describing the risk"),
  theme: z.string().describe("Short theme (max 5 words). Empty string if unknown."),
  theme_project: z
    .string()
    .describe(
      "Project name from known projects, 'Algemeen' for non-project risks, or empty string if unknown.",
    ),
  source_quote: z
    .string()
    .describe(
      "Exact contiguous quote from transcript (max 200 chars). Empty string if not available.",
    ),
  project: z
    .string()
    .describe("Project name this risk belongs to. Empty string when not project-specific."),
  confidence: z.number().describe("0.0-1.0 confidence."),
  metadata: z.object({
    severity: z.enum(["low", "medium", "high", "critical", "n/a"]),
    category: z.enum([
      "financial",
      "scope",
      "technical",
      "client_relationship",
      "team",
      "timeline",
      "strategic",
      "reputation",
      "n/a",
    ]),
    jaip_impact_area: z.enum([
      "delivery",
      "margin",
      "strategy",
      "client",
      "team",
      "reputation",
      "n/a",
    ]),
    raised_by: z.string().describe("Name from participants, 'impliciet', or empty string."),
  }),
  // Verplichte NL toelichting (1-3 zinnen): waarom dit risk, confidence-drivers,
  // overwogen alternatieven. Bedoeld voor calibratie + debug, niet voor UI.
  reasoning: z
    .string()
    .describe(
      "Dutch 1-3 sentence reasoning: why this is a risk (not signal/context), confidence drivers, alternatives considered.",
    ),
});

export const RiskSpecialistRawOutputSchema = z.object({
  risks: z.array(RiskSpecialistRawItemSchema),
});

export type RawRiskSpecialistOutput = z.infer<typeof RiskSpecialistRawOutputSchema>;

/**
 * Publiek type: downstream (UI/DB) werkt met string | null i.p.v. sentinels.
 */
export type RiskSpecialistItem = {
  content: string;
  theme: string | null;
  theme_project: string | null;
  source_quote: string | null;
  project: string | null;
  confidence: number;
  metadata: {
    severity: "low" | "medium" | "high" | "critical" | null;
    category:
      | "financial"
      | "scope"
      | "technical"
      | "client_relationship"
      | "team"
      | "timeline"
      | "strategic"
      | "reputation"
      | null;
    jaip_impact_area: "delivery" | "margin" | "strategy" | "client" | "team" | "reputation" | null;
    raised_by: string | null;
  };
  /** Agent-reasoning: 1-3 NL zinnen over waarom dit risk + confidence-drivers. */
  reasoning: string | null;
};

export type RiskSpecialistOutput = {
  risks: RiskSpecialistItem[];
};
