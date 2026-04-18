/**
 * Single source of truth for the 14 extraction types produced by the
 * MeetingStructurer agent. Tier-1 types power the project workspace
 * panels; Tier-2 types are admin-only on meeting-detail until a consumer
 * activates them.
 *
 * Hardcoded in code (no DB-flag) — promoting a Tier-2 type to Tier-1 is
 * a deliberate code change that ships with the consumer that needs it.
 */

export const TIER_1_TYPES = [
  "action_item",
  "decision",
  "risk",
  "need",
  "commitment",
  "question",
  "signal",
  "context",
  "vision",
] as const;

export const TIER_2_TYPES = [
  "idea",
  "insight",
  "client_sentiment",
  "pricing_signal",
  "milestone",
] as const;

export const ALL_EXTRACTION_TYPES = [...TIER_1_TYPES, ...TIER_2_TYPES] as const;

export type Tier1Type = (typeof TIER_1_TYPES)[number];
export type Tier2Type = (typeof TIER_2_TYPES)[number];
export type ExtractionType = Tier1Type | Tier2Type;

export function isTier1(type: string): type is Tier1Type {
  return (TIER_1_TYPES as readonly string[]).includes(type);
}

export function isTier2(type: string): type is Tier2Type {
  return (TIER_2_TYPES as readonly string[]).includes(type);
}

export function isExtractionType(type: string): type is ExtractionType {
  return isTier1(type) || isTier2(type);
}

/**
 * Dutch label used as the bold marker in summary markdown
 * (`**Risico:** ...`). Picked so legacy markdown round-trips cleanly.
 *
 * action_item has no marker — it is rendered separately as `## Vervolgstappen`.
 * Tier-2 types fall back to a generic `**Type:**` label when rendered.
 */
export const TYPE_MARKDOWN_LABEL: Record<ExtractionType, string | null> = {
  action_item: null,
  decision: "Besluit",
  risk: "Risico",
  need: "Behoefte",
  commitment: "Toezegging",
  question: "Vraag",
  signal: "Signaal",
  context: "Context",
  vision: "Visie",
  idea: "Idee",
  insight: "Inzicht",
  client_sentiment: "Klant-sentiment",
  pricing_signal: "Pricing-signaal",
  milestone: "Mijlpaal",
};

/**
 * Map a markdown label back to its extraction type.
 * Used by the harness + tests to round-trip markdown ↔ structured.
 */
export const MARKDOWN_LABEL_TO_TYPE: Record<string, ExtractionType> = Object.fromEntries(
  Object.entries(TYPE_MARKDOWN_LABEL)
    .filter((entry): entry is [ExtractionType, string] => entry[1] !== null)
    .map(([type, label]) => [label.toLowerCase(), type as ExtractionType]),
);
