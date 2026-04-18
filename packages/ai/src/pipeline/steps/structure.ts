import { runMeetingStructurer } from "../../agents/meeting-structurer";
import type { MeetingStructurerOutput } from "../../validations/meeting-structurer";
import {
  renderMeetingSummary,
  buildLegacyKernpunten,
  buildLegacyVervolgstappen,
} from "../../agents/render-summary";
import { updateMeetingSummary, updateMeetingRawFireflies } from "@repo/database/mutations/meetings";
import { saveStructuredExtractions } from "../save-extractions";
import type { IdentifiedProject } from "../../validations/gatekeeper";

export interface StructureResult {
  success: boolean;
  /** Rendered markdown summary (legacy shape) — null on failure. */
  richSummary: string | null;
  briefing: string | null;
  /** Legacy-shape kernpunten array for the tagger (`### [Project] Theme` + `**Label:** content`). */
  kernpunten: string[];
  /** Legacy-shape vervolgstappen array for the tagger (`[Project] action — owner, deadline`). */
  vervolgstappen: string[];
  /** Raw structured output — useful for downstream consumers that read per-type. */
  structurerOutput: MeetingStructurerOutput | null;
  extractionsSaved: number;
  error: string | null;
}

/**
 * Combined summarize + extract step powered by the MeetingStructurer
 * agent. One Sonnet call produces briefing + 14-type structured
 * kernpunten; this step persists the rendered markdown summary and
 * the structured extractions side-by-side so consumers that still read
 * markdown (tagger, UI, MCP) keep working while new consumers (panels)
 * can query per-type.
 *
 * Non-blocking: returns error info instead of throwing so the caller
 * can fall back to the legacy summarize+extract pair.
 */
export async function runStructureStep(
  meetingId: string,
  transcript: string,
  context: {
    title: string;
    meeting_type: string;
    party_type: string;
    meeting_date: string;
    participants: string[];
    speakerContext?: string | null;
    entityContext?: string;
  },
  rawFireflies: Record<string, unknown>,
  transcriptSource: string,
  identifiedProjects: IdentifiedProject[],
): Promise<StructureResult> {
  try {
    console.info("MeetingStructurer starting...");
    const structurerOutput = await runMeetingStructurer(transcript, {
      ...context,
      identified_projects: identifiedProjects.map((p) => ({
        project_name: p.project_name,
        project_id: p.project_id,
      })),
    });

    const richSummary = renderMeetingSummary(structurerOutput);
    const kernpunten = buildLegacyKernpunten(structurerOutput.kernpunten);
    const vervolgstappen = buildLegacyVervolgstappen(structurerOutput.kernpunten);

    // Persist rendered summary + briefing (same fields legacy writes).
    const updateResult = await updateMeetingSummary(
      meetingId,
      richSummary,
      structurerOutput.briefing,
    );
    if ("error" in updateResult) {
      return {
        success: false,
        richSummary,
        briefing: structurerOutput.briefing,
        kernpunten,
        vervolgstappen,
        structurerOutput,
        extractionsSaved: 0,
        error: `updateMeetingSummary: ${updateResult.error}`,
      };
    }

    // Stamp pipeline metadata (cost-tracking + flag history).
    const updatedRawFireflies = {
      ...rawFireflies,
      pipeline: {
        ...(rawFireflies.pipeline as Record<string, unknown>),
        meeting_structurer: {
          kernpunten_count: structurerOutput.kernpunten.length,
          entities: structurerOutput.entities,
          transcript_source: transcriptSource,
          used_at: new Date().toISOString(),
        },
      },
    };
    await updateMeetingRawFireflies(meetingId, updatedRawFireflies);

    const saveResult = await saveStructuredExtractions(
      structurerOutput,
      meetingId,
      identifiedProjects,
    );

    console.info(
      `MeetingStructurer: ${structurerOutput.kernpunten.length} kernpunten, ` +
        `${structurerOutput.deelnemers.length} deelnemers, ` +
        `${saveResult.extractions_saved} extractions saved`,
    );

    return {
      success: true,
      richSummary,
      briefing: structurerOutput.briefing,
      kernpunten,
      vervolgstappen,
      structurerOutput,
      extractionsSaved: saveResult.extractions_saved,
      error: null,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("MeetingStructurer failed (caller will fall back to legacy):", errMsg);
    return {
      success: false,
      richSummary: null,
      briefing: null,
      kernpunten: [],
      vervolgstappen: [],
      structurerOutput: null,
      extractionsSaved: 0,
      error: errMsg,
    };
  }
}

/**
 * Feature-flag check. Read at call-time (not at module-load) so runtime
 * env-var changes take effect without a redeploy.
 *
 * Default: `false`. Legacy summarize+extract keeps running until Stef
 * sets the flag to `true` via Vercel env vars after PW-02 stap 4
 * (harness) validates the agent on real meetings.
 */
export function isMeetingStructurerEnabled(): boolean {
  return process.env.USE_MEETING_STRUCTURER === "true";
}
