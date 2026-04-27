import { z } from "zod";

/**
 * Action Item Action Validator (stage 3) output.
 *
 * Wordt aangeroepen na de hoofd-extractor voor élk type C/D item dat
 * als jaip_followup_action: productive is geclassificeerd. De validator
 * is adversarieel — defaulting naar consumptive bij twijfel — om de
 * rationalisatie-druk van de extractor te compenseren.
 */
export const ActionItemActionValidatorOutputSchema = z.object({
  verdict: z
    .enum(["productive", "consumptive"])
    .describe(
      "productive = JAIP produceert concrete deliverable (document, mail, beslissing, feedback, planning). consumptive = JAIP consumeert/observeert zonder eigen output (langskomen, sluit aan, luistert mee, analyseren zonder concrete deliverable). Bij twijfel: consumptive.",
    ),
  reason: z
    .string()
    .describe(
      "1 NL zin: bij productive welke concrete deliverable JAIP produceert; bij consumptive waarom er geen output is.",
    ),
});

export type ActionItemActionValidatorOutput = z.infer<typeof ActionItemActionValidatorOutputSchema>;
