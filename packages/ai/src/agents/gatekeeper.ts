import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { GatekeeperSchema, GatekeeperOutput } from "../validations/gatekeeper";

export type { GatekeeperOutput };

const SYSTEM_PROMPT = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../prompts/gatekeeper.md"),
  "utf8",
).trimEnd();

export interface ParticipantInfo {
  raw: string;
  label: "internal" | "external" | "unknown";
  matchedName?: string;
  organizationName?: string | null;
  organizationType?: string | null;
  /** True wanneer deze persoon gekoppeld is aan een profiles-row met role='admin' (sprint 035). */
  isAdmin?: boolean;
}

export async function runGatekeeper(
  notes: string,
  metadata: {
    title?: string;
    participants?: ParticipantInfo[];
    date?: string;
    topics?: string[];
    entityContext?: string;
  },
): Promise<GatekeeperOutput> {
  const participantLines = metadata.participants?.length
    ? metadata.participants
        .map((p) => {
          const name = p.matchedName ?? p.raw;
          if (p.label === "internal") return `- ${name} (INTERN)`;
          if (p.label === "external") {
            const orgSuffix = p.organizationName ? ` - ${p.organizationName}` : "";
            return `- ${name} (EXTERN${orgSuffix})`;
          }
          return `- ${name} (ONBEKEND)`;
        })
        .join("\n")
    : null;

  const contextPrefix = [
    metadata.title ? `Titel: ${metadata.title}` : null,
    participantLines ? `Deelnemers:\n${participantLines}` : null,
    metadata.date ? `Datum: ${metadata.date}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const topicsSection = metadata.topics?.length
    ? `\n\nBesproken onderwerpen:\n${metadata.topics.join(", ")}`
    : "";

  const entitySection = metadata.entityContext ? `\n\n${metadata.entityContext}` : "";

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    maxRetries: 3,
    schema: GatekeeperSchema,
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
        content: `${contextPrefix}${topicsSection}${entitySection}\n\nMeeting Notes:\n${notes}`,
      },
    ],
  });

  return object;
}
