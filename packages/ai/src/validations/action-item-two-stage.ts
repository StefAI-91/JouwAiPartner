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
  quote: z.string().describe("Letterlijke trigger-zin uit transcript, max 200 chars."),
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
  context_summary: z
    .string()
    .describe("1-2 NL zinnen over wat hieraan voorafging of wat er omheen werd besproken."),
});

export const ActionItemCandidatesSchema = z.object({
  candidates: z.array(ActionItemCandidateSchema),
});

export type ActionItemCandidate = z.infer<typeof ActionItemCandidateSchema>;
export type ActionItemCandidatesOutput = z.infer<typeof ActionItemCandidatesSchema>;

/**
 * Judge-output: union van accept (action_item-velden) en reject (reden).
 * Anthropic structured output staat geen union toe — daarom één flat schema
 * met `decision` als discriminator en alle velden optional. Caller filtert.
 */
export const ActionItemJudgementSchema = ActionItemSpecialistRawItemSchema.extend({
  candidate_index: z.number().int().min(1).describe("1-based volgnummer uit candidate-input."),
  decision: z.enum(["accept", "reject"]).describe("accept = wel action_item, reject = niet."),
  rejection_reason: z
    .string()
    .describe("Bij reject: kort welke van V1/V2/V3 faalt. Bij accept: lege string. Geen sentinel."),
});

export const ActionItemJudgementsSchema = z.object({
  judgements: z.array(ActionItemJudgementSchema),
});

export type ActionItemJudgement = z.infer<typeof ActionItemJudgementSchema>;
export type ActionItemJudgementsOutput = z.infer<typeof ActionItemJudgementsSchema>;
