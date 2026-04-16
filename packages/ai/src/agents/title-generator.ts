import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const TitleSubjectSchema = z.object({
  subject: z
    .string()
    .describe("Kort, informatief onderwerp van de meeting (max 50 tekens, Nederlands)"),
});

export type TitleSubjectOutput = z.infer<typeof TitleSubjectSchema>;

const SYSTEM_PROMPT = `Je genereert een kort onderwerp voor een meeting-titel.

KERNREGEL: beschrijf alleen het HOOFDONDERWERP — het ene ding waar de meeting over ging.
Noem NIET alle besproken topics. Als er 5 onderwerpen aan bod kwamen, kies het belangrijkste.

REGELS:
- Maximaal 40 tekens
- Nederlands
- Alleen het hoofdonderwerp, geen opsomming
- Geen prefix, type-aanduiding, organisatienaam of persoonsnamen — dat wordt apart toegevoegd
- Geen aanhalingstekens
- Wees specifiek: "migratie naar Vercel" is beter dan "technische zaken"
- Bij een kennismaking: beschrijf de BEHOEFTE van de klant, niet wat er allemaal besproken is
- Bij een statusupdate: beschrijf de KERN van de voortgang, niet elk detail
- Bij strategie: beschrijf het BESLUIT of de RICHTING, niet de hele agenda

GOED:
- "automatisering orderproces"
- "voortgang sprint 4"
- "offerte website"
- "planning Q3"
- "code review werkwijze"

FOUT (te breed, opsommend):
- "automatisering, website en planning besproken"
- "sprint 4, bugs en nieuwe features"
- "kennismaking en bespreking mogelijkheden platform"`;

export async function generateMeetingSubject(summary: string): Promise<string> {
  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    maxRetries: 2,
    schema: TitleSubjectSchema,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      {
        role: "user",
        content: `Genereer een kort onderwerp voor deze meeting:\n\n${summary.slice(0, 2000)}`,
      },
    ],
  });

  return object.subject;
}
