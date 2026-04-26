import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  SpeakerMappingOutputSchema,
  type SpeakerMappingOutput,
} from "../validations/speaker-identifier";
import {
  parseElevenLabsUtterances,
  parseFirefliesUtterances,
  sampleUtterancesPerName,
  sampleUtterancesPerSpeaker,
} from "./speaker-identifier-sampling";
import { withAgentRun } from "./run-logger";

/**
 * Speaker Identifier — Haiku-agent die anonieme `speaker_X`-labels uit een
 * ElevenLabs-transcript probeert te mappen aan de meegegeven deelnemers.
 *
 * Kostbewust: input = sample-utterances per speaker (niet hele transcript) +
 * deelnemerslijst; output = compacte JSON-map per speaker_id. Tekst van het
 * transcript wordt nooit door het model heen geschreven — code doet de rewrite
 * later.
 */

const PROMPT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../prompts/speaker_identifier.md",
);

const SPEAKER_IDENTIFIER_MODEL = "claude-haiku-4-5-20251001";

function loadPrompt(): string {
  return readFileSync(PROMPT_PATH, "utf8").trimEnd();
}

export interface SpeakerIdentifierParticipant {
  name: string;
  role: string | null;
  organization: string | null;
  organization_type: string | null;
}

export interface SpeakerIdentifierInput {
  /** ElevenLabs-transcript met anonieme labels (`[speaker_0]: text`). */
  transcript: string;
  /** Optionele Fireflies-transcript met named labels (`Stef Banninga: text`).
   *  Als beschikbaar wordt ook hieruit gesamplet en aan het model gegeven —
   *  het model gebruikt content-overlap tussen de blocks om speaker_X aan
   *  Fireflies-namen te koppelen. Werkt zelfs als Fireflies-attributie
   *  incompleet is (bv. alle utterances naar één naam). */
  firefliesTranscript?: string | null;
  participants: SpeakerIdentifierParticipant[];
  /** Aantal sample-utterances per speaker. Default 6. */
  perSpeaker?: number;
}

export interface SpeakerIdentifierResult {
  mapping: SpeakerMappingOutput;
  /** Wat naar het model is gestuurd — handig voor debug in test-pagina. */
  debug: {
    speaker_ids: string[];
    samples: Record<string, string[]>;
    fireflies_names: string[];
    fireflies_samples: Record<string, string[]>;
    user_message: string;
  };
  metrics: {
    latency_ms: number;
    input_tokens: number | null;
    output_tokens: number | null;
  };
}

function formatParticipantBlock(participants: SpeakerIdentifierParticipant[]): string {
  if (participants.length === 0) return "Deelnemers: (geen geregistreerd)";
  const lines = participants.map((p) => {
    const orgPart = p.organization
      ? p.organization_type
        ? `${p.organization} — ${p.organization_type}`
        : p.organization
      : null;
    const meta = [orgPart, p.role].filter(Boolean).join(", ");
    return meta ? `- ${p.name} (${meta})` : `- ${p.name}`;
  });
  return ["Deelnemers:", ...lines].join("\n");
}

function formatSampleBlock(
  samples: Map<string, string[]>,
  labelWrap: (key: string) => string,
): string {
  return Array.from(samples.entries())
    .map(([key, utterances]) => {
      const numbered = utterances.map((u, i) => `  ${i + 1}. "${u}"`).join("\n");
      return `${labelWrap(key)} (${utterances.length} samples):\n${numbered}`;
    })
    .join("\n\n");
}

function buildUserMessage(
  samples: Map<string, string[]>,
  firefliesSamples: Map<string, string[]>,
  participants: SpeakerIdentifierParticipant[],
): string {
  const blocks: string[] = [
    formatParticipantBlock(participants),
    "",
    "--- ELEVENLABS-SAMPLES (anonieme labels) ---",
    formatSampleBlock(samples, (s) => `[${s}]`),
  ];

  if (firefliesSamples.size > 0) {
    blocks.push(
      "",
      "--- FIREFLIES-SAMPLES (named labels — kan onvolledig of foutief zijn) ---",
      formatSampleBlock(firefliesSamples, (n) => n),
    );
  }

  blocks.push("", "Geef voor elke speaker_id één mapping-entry. Lege person_name bij twijfel.");
  return blocks.join("\n");
}

export async function runSpeakerIdentifier(
  input: SpeakerIdentifierInput,
): Promise<SpeakerIdentifierResult> {
  const startedAt = Date.now();
  const utterances = parseElevenLabsUtterances(input.transcript);
  const samples = sampleUtterancesPerSpeaker(utterances, input.perSpeaker ?? 6);
  const speaker_ids = Array.from(samples.keys()).sort();

  const firefliesUtterances = input.firefliesTranscript
    ? parseFirefliesUtterances(input.firefliesTranscript)
    : [];
  const firefliesSamples = sampleUtterancesPerName(firefliesUtterances, input.perSpeaker ?? 6);
  const firefliesNames = Array.from(firefliesSamples.keys()).sort();

  const userMessage = buildUserMessage(samples, firefliesSamples, input.participants);

  const run = await withAgentRun(
    {
      agent_name: "speaker-identifier",
      model: SPEAKER_IDENTIFIER_MODEL,
      prompt_version: "v1",
    },
    async () => {
      const res = await generateObject({
        model: anthropic(SPEAKER_IDENTIFIER_MODEL),
        maxRetries: 3,
        temperature: 0,
        maxOutputTokens: 4000,
        schema: SpeakerMappingOutputSchema,
        messages: [
          {
            role: "system",
            content: loadPrompt(),
            providerOptions: {
              anthropic: { cacheControl: { type: "ephemeral" } },
            },
          },
          { role: "user", content: userMessage },
        ],
      });
      return { result: { object: res.object, usage: res.usage }, usage: res.usage };
    },
  );

  // Clamp confidence
  for (const item of run.object.mappings) {
    item.confidence = Math.max(0, Math.min(1, item.confidence));
  }

  return {
    mapping: run.object,
    debug: {
      speaker_ids,
      samples: Object.fromEntries(samples),
      fireflies_names: firefliesNames,
      fireflies_samples: Object.fromEntries(firefliesSamples),
      user_message: userMessage,
    },
    metrics: {
      latency_ms: Date.now() - startedAt,
      input_tokens: typeof run.usage?.inputTokens === "number" ? run.usage.inputTokens : null,
      output_tokens: typeof run.usage?.outputTokens === "number" ? run.usage.outputTokens : null,
    },
  };
}

export function getSpeakerIdentifierPrompt(): string {
  return loadPrompt();
}
