import {
  runActionItemSpecialist,
  ACTION_ITEM_SPECIALIST_MODEL,
  type ActionItemSpecialistContext,
  type ActionItemSpecialistParticipant,
} from "../../agents/action-item-specialist";
import { insertExperimentalActionItemExtraction } from "@repo/database/mutations/extractions/experimental-action-items";
import { saveActionItemExtractions } from "../save-action-item-extractions";
import type { IdentifiedProject } from "../../validations/gatekeeper";
import type { KnownPerson } from "@repo/database/queries/people";

/**
 * Bouwt de rich participant-shape die de Action Item Specialist nodig heeft
 * (`{name, role, organization, organization_type}`) door per raw participant-
 * string te matchen tegen de `knownPeople`-cache. Bij geen match: rij met
 * alleen `name` en de rest null — dan zien we tenminste de naam in het
 * prompt-context-blok.
 *
 * Dedup op naam (lowercased) zodat dubbele Fireflies-entries niet als aparte
 * rijen verschijnen.
 */
export function buildActionItemParticipants(
  rawParticipants: string[],
  knownPeople: KnownPerson[],
): ActionItemSpecialistParticipant[] {
  const seen = new Set<string>();
  const out: ActionItemSpecialistParticipant[] = [];

  for (const raw of rawParticipants) {
    const normalised = raw?.trim().toLowerCase();
    if (!normalised) continue;

    const match =
      knownPeople.find((p) => p.email && p.email.toLowerCase() === normalised) ??
      knownPeople.find((p) => p.name.toLowerCase() === normalised);

    const name = match?.name ?? raw.trim();
    const dedupKey = name.toLowerCase();
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    out.push({
      name,
      role: match?.role ?? null,
      organization: match?.organization_name ?? null,
      organization_type: match?.organization_type ?? null,
    });
  }

  return out;
}

/** Productie-promptversie. Bewust losse constante zodat de step één plek
 *  heeft om aan te zetten als de prompt verschoven moet worden. */
const ACTION_ITEM_SPECIALIST_PIPELINE_PROMPT_VERSION = "v5" as const;

/** Productie-modus. Single-stage is goedkoper dan two-stage en de
 *  prompt-tuning zit op v5 single. */
const ACTION_ITEM_SPECIALIST_PIPELINE_MODE = "single" as const;

/**
 * Productie-step voor de Action Item Specialist. Persisteert de output op
 * twee plekken, elk met een eigen verantwoordelijkheid:
 *
 *  1. `extractions` (type='action_item') — wat de UI/review-flow ziet.
 *     Idempotent: replace alleen rijen met
 *     `metadata.source = 'action_item_specialist'` die nog niet verified
 *     zijn. Handmatige rijen en al-geverifieerde specialist-rijen blijven.
 *
 *  2. `experimental_action_item_extractions` — append-only run-telemetrie:
 *     model, prompt_version, mode, latency, token-counts, accept/gate-
 *     counts, eventuele error. Bedoeld voor cost-analyse en prompt-drift
 *     zonder de productie-rijen te vervuilen.
 *
 * **Transcript-keuze.** De caller geeft `input.transcript` (Fireflies) mee,
 * NIET `bestTranscript`. Reden: action-item-specialist matcht op letterlijke
 * `source_quote`; speaker-mapping introduceert kleine drift in named-
 * transcripts. Zie `docs/stand-van-zaken.md` regels 95 + 159 + 165 en
 * sprint 041.
 *
 * Never throws: agent-failure, save-failure en telemetrie-failure zijn
 * onafhankelijk gevangen. Bij agent-crash wordt een error-rij in de
 * telemetrie weggeschreven zodat "did it fail?" onderscheidbaar blijft van
 * "did it not run?".
 */
export async function runActionItemSpecialistStep(
  meetingId: string,
  transcript: string,
  context: ActionItemSpecialistContext,
  identifiedProjects: IdentifiedProject[],
): Promise<void> {
  const model = ACTION_ITEM_SPECIALIST_MODEL;
  const promptVersion = ACTION_ITEM_SPECIALIST_PIPELINE_PROMPT_VERSION;
  const mode = ACTION_ITEM_SPECIALIST_PIPELINE_MODE;

  if (!transcript || !transcript.trim()) {
    // Geen bruikbaar transcript — schrijf een telemetrie-rij zodat we zien
    // dat de step is overgeslagen, en stop. Geen save-call.
    try {
      await insertExperimentalActionItemExtraction({
        meeting_id: meetingId,
        model,
        prompt_version: promptVersion,
        mode,
        items: [],
        gated: [],
        accept_count: 0,
        gate_count: 0,
        error: "no transcript",
      });
    } catch (telemetryErr) {
      console.error(
        "ActionItemSpecialist telemetry-save failed (non-blocking):",
        telemetryErr instanceof Error ? telemetryErr.message : String(telemetryErr),
      );
    }
    return;
  }

  try {
    const { output, gated, metrics } = await runActionItemSpecialist(transcript, context, {
      promptVersion,
      validateAction: true,
    });

    // Run-telemetrie: latency / tokens / counts. Mag falen zonder de
    // productie-save te blokkeren.
    try {
      await insertExperimentalActionItemExtraction({
        meeting_id: meetingId,
        model,
        prompt_version: promptVersion,
        mode,
        items: output.items,
        gated,
        accept_count: output.items.length,
        gate_count: gated.length,
        latency_ms: metrics.latency_ms,
        input_tokens: metrics.input_tokens,
        output_tokens: metrics.output_tokens,
        reasoning_tokens: metrics.reasoning_tokens,
        error: null,
      });
    } catch (telemetryErr) {
      console.error(
        "ActionItemSpecialist telemetry-save failed (non-blocking):",
        telemetryErr instanceof Error ? telemetryErr.message : String(telemetryErr),
      );
    }

    // Productie-save: action_items naar de gedeelde extractions-tabel.
    try {
      const saveResult = await saveActionItemExtractions(output, meetingId, identifiedProjects);
      console.info(
        `ActionItemSpecialist: ${saveResult.extractions_saved} items saved ` +
          `(${saveResult.extractions_replaced} drafts replaced, ${gated.length} gated), ` +
          `${metrics.latency_ms}ms`,
      );
    } catch (saveErr) {
      console.error(
        "ActionItemSpecialist save to extractions failed (non-blocking):",
        saveErr instanceof Error ? saveErr.message : String(saveErr),
      );
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("ActionItemSpecialist agent failed (non-blocking):", errMsg);
    // Schrijf een error-rij naar de telemetrie zodat "did it fail?"
    // onderscheidbaar blijft van "did it not run?".
    try {
      await insertExperimentalActionItemExtraction({
        meeting_id: meetingId,
        model,
        prompt_version: promptVersion,
        mode,
        items: [],
        gated: [],
        accept_count: 0,
        gate_count: 0,
        error: errMsg,
      });
    } catch (saveErr) {
      console.error(
        "Failed to record ActionItemSpecialist failure row:",
        saveErr instanceof Error ? saveErr.message : String(saveErr),
      );
    }
  }
}
