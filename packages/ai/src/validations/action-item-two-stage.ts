import { z } from "zod";
import { ActionItemSpecialistRawItemSchema } from "./action-item-specialist";

/**
 * Schemas voor de twee-staps Action Item extractie.
 *
 * Stage 1 — Candidate Spotter: scant transcript, output array van candidates
 * met soft pattern-classificatie. Geen filtering, max recall.
 *
 * Stage 2 — Judge: krijgt candidates + transcript, output per kandidaat een
 * accept (volledige action_item) of reject (rejection_reason).
 */

export const ActionItemCandidateSchema = z.object({
  quote: z
    .string()
    .describe("Letterlijke trigger-zin uit transcript, max 120 chars. Houd zo kort mogelijk."),
  speaker: z.string().describe("Exacte naam uit participants-input. Geen 'speaker_0'."),
  pattern_type: z
    .enum([
      "toezegging",
      "aanwijzing",
      "werkbeschrijving",
      "wachtende_uitspraak",
      "beslissing",
      "reminder_verzoek",
      "klantverzoek",
    ])
    .describe("Welke van de zeven candidate-patronen deze quote raakt."),
});

export const ActionItemCandidatesSchema = z.object({
  candidates: z.array(ActionItemCandidateSchema),
});

export type ActionItemCandidate = z.infer<typeof ActionItemCandidateSchema>;
export type ActionItemCandidatesOutput = z.infer<typeof ActionItemCandidatesSchema>;

/**
 * Judge-output: split in twee arrays zodat elk een eigen strict schema heeft.
 * Anthropic strict-mode accepteert geen omitted velden; bij accept zijn alle
 * action_item-velden verplicht, bij reject alleen index + reason. Twee arrays
 * lossen dit cleaner op dan één schema met alles optional.
 *
 * Numerieke constraints (.int().min(1)) zijn weggelaten — Anthropic strict-
 * mode handelt min/max niet betrouwbaar af, dezelfde reden als waarom de
 * confidence-veld in ActionItemSpecialistRawItemSchema post-clamped wordt.
 */
export const ActionItemAcceptedSchema = ActionItemSpecialistRawItemSchema.extend({
  candidate_index: z.number().describe("1-based volgnummer uit candidate-input."),
});

export const ActionItemRejectedSchema = z.object({
  candidate_index: z.number().describe("1-based volgnummer uit candidate-input."),
  rejection_reason: z.string().describe("Kort welke van V1/V2/V3 faalt en waarom."),
});

export const ActionItemJudgementsSchema = z.object({
  accepts: z.array(ActionItemAcceptedSchema),
  rejects: z.array(ActionItemRejectedSchema),
});

export type ActionItemAccepted = z.infer<typeof ActionItemAcceptedSchema>;
export type ActionItemRejected = z.infer<typeof ActionItemRejectedSchema>;
export type ActionItemJudgementsOutput = z.infer<typeof ActionItemJudgementsSchema>;

/**
 * Verenigde view die de UI gebruikt om accepts en rejects naast elkaar te
 * tonen, gesorteerd op candidate_index.
 */
export interface ActionItemJudgement {
  candidate_index: number;
  decision: "accept" | "reject";
  /** Alleen gevuld bij accept. */
  accepted?: ActionItemAccepted;
  /** Alleen gevuld bij reject. */
  rejection_reason?: string;
}
