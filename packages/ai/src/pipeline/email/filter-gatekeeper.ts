/**
 * Email Filter Gatekeeper — pre-save beslissing of een e-mail in de hoofd-inbox
 * komt of in de audit-tab "Gefilterd" belandt.
 *
 * Pure functie (geen DB calls, geen AI calls). Neemt de classifier output,
 * beslist op basis van harde regels.
 *
 * Regels (in deze volgorde geëvalueerd):
 *   1. Safety net — NOOIT filteren:
 *      - party_type IN ('client', 'accountant', 'tax_advisor', 'lawyer')
 *      - email_type = 'legal_finance'
 *   2. Hard filter — altijd filteren:
 *      - email_type IN ('newsletter', 'notification', 'cold_outreach')
 *   3. Low relevance:
 *      - relevance_score < 0.4
 *
 * Alle andere emails gaan door ('kept').
 */

const PROTECTED_PARTY_TYPES = new Set(["client", "accountant", "tax_advisor", "lawyer"]);
const PROTECTED_EMAIL_TYPES = new Set(["legal_finance"]);
const HARD_FILTER_EMAIL_TYPES = new Set(["newsletter", "notification", "cold_outreach"]);
const MIN_RELEVANCE_THRESHOLD = 0.4;

export type FilterReason = "newsletter" | "notification" | "cold_outreach" | "low_relevance";

export interface FilterDecision {
  filter_status: "kept" | "filtered";
  filter_reason: FilterReason | null;
}

export function decideEmailFilter(classifier: {
  relevance_score: number;
  email_type: string;
  party_type: string;
}): FilterDecision {
  // 1. Safety net — protected parties/types always pass through
  if (PROTECTED_PARTY_TYPES.has(classifier.party_type)) {
    return { filter_status: "kept", filter_reason: null };
  }
  if (PROTECTED_EMAIL_TYPES.has(classifier.email_type)) {
    return { filter_status: "kept", filter_reason: null };
  }

  // 2. Hard filter on type
  if (HARD_FILTER_EMAIL_TYPES.has(classifier.email_type)) {
    return {
      filter_status: "filtered",
      filter_reason: classifier.email_type as FilterReason,
    };
  }

  // 3. Low relevance filter
  if (classifier.relevance_score < MIN_RELEVANCE_THRESHOLD) {
    return { filter_status: "filtered", filter_reason: "low_relevance" };
  }

  return { filter_status: "kept", filter_reason: null };
}
