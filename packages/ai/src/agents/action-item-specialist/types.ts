import type {
  ActionItemSpecialistItem,
  ActionItemSpecialistOutput,
} from "../../validations/action-item-specialist";
import type {
  ActionItemCandidate,
  ActionItemJudgement,
} from "../../validations/action-item-two-stage";

export type ActionItemPromptVersion = "v2" | "v3" | "v4" | "v5";

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
