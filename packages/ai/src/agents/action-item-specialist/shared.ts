import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ActionItemFollowupAction,
  ActionItemRecipientPerQuote,
  ActionItemSpecialistItem,
  ActionItemSpecialistOutput,
  RawActionItemSpecialistOutput,
} from "../../validations/action-item-specialist";
import { emptyToNull, sentinelToNull } from "../../utils/normalise";
import { resolveFollowUpDate } from "../action-item-follow-up";
import type { ActionItemSpecialistParticipant } from "./types";

export const PROMPT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../../prompts");

/** Render één participant-regel: "Stef (JAIP, CEO)" of "Sandra (Acme BV — client)".
 *  Houdt het compact maar toont alle info die ContextPrefix anders mist. */
function formatParticipantLine(p: ActionItemSpecialistParticipant): string {
  const orgPart = p.organization
    ? p.organization_type
      ? `${p.organization} — ${p.organization_type}`
      : p.organization
    : null;
  const meta = [orgPart, p.role].filter(Boolean).join(", ");
  return meta ? `${p.name} (${meta})` : p.name;
}

export function formatParticipantBlock(participants: ActionItemSpecialistParticipant[]): string {
  if (participants.length === 0) return "Deelnemers: (geen geregistreerd)";
  return ["Deelnemers:", ...participants.map((p) => `- ${formatParticipantLine(p)}`)].join("\n");
}

export function buildContextPrefix(context: {
  title: string;
  meeting_type: string;
  party_type: string;
  meeting_date: string;
  participants: ActionItemSpecialistParticipant[];
}): string {
  return [
    `Titel: ${context.title}`,
    `Type: ${context.meeting_type}`,
    `Party: ${context.party_type}`,
    `Meetingdatum: ${context.meeting_date}`,
    formatParticipantBlock(context.participants),
  ].join("\n");
}

/**
 * Past de follow-up-resolver toe op een lijst items: bij gevulde deadline
 * wordt `follow_up_date` deterministisch overschreven (type A = deadline,
 * type B/C/D = deadline − 1 werkdag, met floor > meetingdatum). Bij lege
 * deadline blijft de AI-extracted waarde staan, mits ná meeting.
 */
export function applyFollowUpResolver(
  items: ActionItemSpecialistItem[],
  meetingDate: string,
): void {
  for (const item of items) {
    item.follow_up_date = resolveFollowUpDate({
      deadline: item.deadline,
      aiFollowUp: item.follow_up_date,
      typeWerk: item.type_werk,
      meetingDate,
    });
  }
}

export function normaliseActionItemSpecialistOutput(
  raw: RawActionItemSpecialistOutput,
): ActionItemSpecialistOutput {
  return {
    items: raw.items.map(
      (r): ActionItemSpecialistItem => ({
        content: r.content,
        follow_up_contact: r.follow_up_contact,
        assignee: emptyToNull(r.assignee),
        source_quote: emptyToNull(r.source_quote),
        project_context: emptyToNull(r.project_context),
        deadline: emptyToNull(r.deadline),
        follow_up_date: emptyToNull(r.follow_up_date),
        type_werk: r.type_werk,
        category: sentinelToNull(r.category) as
          | "wachten_op_extern"
          | "wachten_op_beslissing"
          | null,
        confidence: r.confidence,
        reasoning: emptyToNull(r.reasoning),
        recipient_per_quote: r.recipient_per_quote,
        jaip_followup_quote: emptyToNull(r.jaip_followup_quote),
        jaip_followup_action: r.jaip_followup_action,
      }),
    ),
  };
}

/**
 * Mechanische gate voor type C/D items.
 *
 * Het model krijgt twee verplichte velden (recipient_per_quote en
 * jaip_followup_quote) waar het de feiten zelf moet benoemen voordat het
 * accept kan zeggen. Deze functie controleert die feiten in code, los van
 * de prompt — geen ruimte voor rationalisatie via taal.
 *
 * Type A (intern) en B (JAIP levert) gaan altijd door — de gate geldt
 * alleen voor type C en D waar het rationalisatie-probleem zit.
 *
 * Returns: null als gate passes (item mag door), string met reden als gate
 * faalt (item moet downgraden naar reject).
 */
export function checkActionItemGate(item: {
  type_werk: "A" | "B" | "C" | "D";
  recipient_per_quote: ActionItemRecipientPerQuote;
  jaip_followup_quote: string;
  jaip_followup_action: ActionItemFollowupAction;
}): string | null {
  if (item.type_werk !== "C" && item.type_werk !== "D") return null;
  if (item.recipient_per_quote !== "stef_wouter") {
    return `auto-gate: recipient_per_quote=${item.recipient_per_quote} (vereist stef_wouter voor type ${item.type_werk})`;
  }
  if (!item.jaip_followup_quote.trim()) {
    return `auto-gate: jaip_followup_quote leeg (geen citaat van JAIP-vervolgstap gevonden voor type ${item.type_werk})`;
  }
  if (item.jaip_followup_action !== "productive") {
    return `auto-gate: jaip_followup_action=${item.jaip_followup_action} (vereist productive voor type ${item.type_werk}; consumptief vervolg = niet trackbaar als wachtende JAIP-deliverable)`;
  }
  return null;
}

/**
 * Pakt ±N turns rond de eerste match van de quote in het transcript.
 * Als de quote niet wordt gevonden, valt terug op de hele transcript
 * (afgekapt op 4000 chars zodat de validator niet in een 30k-input
 * verdrinkt). De validator hoeft niet het hele transcript te zien —
 * alleen genoeg context om productive/consumptive te beoordelen.
 */
export function extractTranscriptContext(
  transcript: string,
  quote: string,
  surroundingChars = 1500,
): string {
  if (!quote.trim()) return transcript.slice(0, 4000);
  const idx = transcript.indexOf(quote);
  if (idx < 0) {
    const firstWords = quote.trim().split(/\s+/).slice(0, 6).join(" ");
    const fuzzyIdx = transcript.indexOf(firstWords);
    if (fuzzyIdx < 0) return transcript.slice(0, 4000);
    return sliceAround(transcript, fuzzyIdx, surroundingChars);
  }
  return sliceAround(transcript, idx, surroundingChars);
}

function sliceAround(transcript: string, idx: number, surroundingChars: number): string {
  const start = Math.max(0, idx - surroundingChars);
  const end = Math.min(transcript.length, idx + surroundingChars);
  return (
    (start > 0 ? "...\n" : "") +
    transcript.slice(start, end) +
    (end < transcript.length ? "\n..." : "")
  );
}
