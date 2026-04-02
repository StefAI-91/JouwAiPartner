import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  SummarizerOutputSchema,
  SummarizerOutput,
} from "../validations/summarizer";

export type { SummarizerOutput };

const SYSTEM_PROMPT = `Je bent de Summarizer: je maakt rijke, gestructureerde samenvattingen van meeting transcripten.
ALLE output moet in het Nederlands zijn (behalve exacte quotes als het transcript deels in het Engels is).

Je produceert:
1. KERNPUNTEN — 3-7 belangrijkste punten van de meeting, elk 1-2 zinnen. Prioriteer: besluiten > concrete afspraken > inzichten > context.
2. DEELNEMERS — Profiel per deelnemer: naam, rol, organisatie, houding. Afleiden uit het gesprek als het niet expliciet gezegd wordt.
3. THEMA'S — De besproken onderwerpen, elk met een korte beschrijving en 1-3 letterlijke quotes uit het transcript.
4. SFEER — Beschrijf de toon en dynamiek: was het constructief, gespannen, informeel, brainstorm-achtig?
5. CONTEXT — Waarom is deze meeting relevant? Wat ging eraan vooraf? Wat is de bredere context?
6. VERVOLGSTAPPEN — Concrete next steps die uit het gesprek komen.

REGELS:
- Quotes moeten EXACT uit het transcript komen, niet geparafraseerd.
- Wees concreet en specifiek, geen algemeenheden.
- Als een thema niet expliciet besproken is, neem het dan niet op.
- Deelnemerprofielen: gebruik wat je kunt afleiden uit het gesprek. Als iemand weinig zegt, is "beperkte bijdrage" een valide stance.
- Kernpunten zijn het belangrijkste onderdeel — hier draait de meeting om.`;

/**
 * Run the Summarizer agent on a meeting transcript.
 * Uses Sonnet for reasoning capability — generates a rich, structured summary.
 */
export async function runSummarizer(
  transcript: string,
  context: {
    title: string;
    meeting_type: string;
    party_type: string;
    participants: string[];
  },
): Promise<SummarizerOutput> {
  const contextPrefix = [
    `Titel: ${context.title}`,
    `Type: ${context.meeting_type}`,
    `Party: ${context.party_type}`,
    `Deelnemers: ${context.participants.join(", ")}`,
  ].join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5-20250929"),
    schema: SummarizerOutputSchema,
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
        content: `${contextPrefix}\n\n--- TRANSCRIPT ---\n${transcript}`,
      },
    ],
  });

  return object;
}

/**
 * Format a SummarizerOutput as readable text for the summary column.
 * Structured with clear sections so it works in UI, embeddings, and MCP tools.
 */
export function formatSummary(output: SummarizerOutput): string {
  const sections: string[] = [];

  // Kernpunten
  sections.push(
    "## Kernpunten\n" + output.kernpunten.map((k) => `- ${k}`).join("\n"),
  );

  // Deelnemers
  const deelnemerLines = output.deelnemers.map((d) => {
    const parts = [d.name];
    if (d.role) parts.push(d.role);
    if (d.organization) parts.push(d.organization);
    if (d.stance) parts.push(`(${d.stance})`);
    return `- ${parts.join(" — ")}`;
  });
  sections.push("## Deelnemers\n" + deelnemerLines.join("\n"));

  // Thema's
  const themaBlocks = output.themas.map((t) => {
    const quotes = t.quotes.map((q) => `  > "${q}"`).join("\n");
    return `### ${t.title}\n${t.summary}\n${quotes}`;
  });
  sections.push("## Besproken thema's\n" + themaBlocks.join("\n\n"));

  // Sfeer
  sections.push(`## Sfeer & dynamiek\n${output.sfeer}`);

  // Context
  sections.push(`## Context\n${output.context}`);

  // Vervolgstappen
  if (output.vervolgstappen.length > 0) {
    sections.push(
      "## Vervolgstappen\n" +
        output.vervolgstappen.map((v) => `- ${v}`).join("\n"),
    );
  }

  return sections.join("\n\n");
}
