import { z } from "zod";

/**
 * Output-schema voor de speaker-identifier-agent.
 *
 * Eén entry per anonieme `speaker_id` uit het ElevenLabs-transcript. Het model
 * mag `person_name` leeg laten ("") als het niet zeker is — code interpreteert
 * dat als "geen mapping, blijft anoniem".
 */
export const SpeakerMappingItemSchema = z.object({
  speaker_id: z
    .string()
    .describe("Het anonieme label uit het transcript, bv. 'speaker_0', 'speaker_1', 'unknown'."),
  person_name: z
    .string()
    .describe(
      "Exacte naam uit de meegegeven Deelnemers-lijst, of lege string als geen vertrouwen. NOOIT een naam verzinnen die niet in de lijst staat.",
    ),
  confidence: z
    .number()
    .describe(
      "0.0 - 1.0. 0.85+ = zeer overtuigend, 0.6-0.85 = waarschijnlijk, < 0.6 = onzeker (geef dan liever lege person_name).",
    ),
  reasoning: z
    .string()
    .describe(
      "1-2 NL zinnen: welke clue uit de utterances of deelnemerslijst je naar deze persoon leidde. Geen meta-talk.",
    ),
});

export const SpeakerMappingOutputSchema = z.object({
  mappings: z.array(SpeakerMappingItemSchema),
});

export type SpeakerMappingItem = z.infer<typeof SpeakerMappingItemSchema>;
export type SpeakerMappingOutput = z.infer<typeof SpeakerMappingOutputSchema>;
