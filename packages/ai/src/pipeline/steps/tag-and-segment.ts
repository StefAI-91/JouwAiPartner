import { runTagger } from "../tagger";
import { buildSegments } from "../lib/segment-builder";
import { embedBatch } from "../../embeddings";
import { getIgnoredEntityNames } from "@repo/database/queries/ignored-entities";
import {
  insertMeetingProjectSummaries,
  updateSegmentEmbedding,
} from "@repo/database/mutations/meetings/project-summaries";
import type { IdentifiedProject } from "../../validations/gatekeeper";

export interface TagAndSegmentInput {
  meetingId: string;
  organizationId: string | null;
  kernpunten: string[];
  vervolgstappen: string[];
  identifiedProjects: IdentifiedProject[];
  knownProjects: { id: string; name: string; aliases: string[] }[];
}

export interface TagAndSegmentResult {
  segmentsSaved: number;
  errors: string[];
}

/**
 * Tagger + segment-bouw step: classifies kernpunten/vervolgstappen per
 * project, writes meeting_project_summaries rows, embeds each segment.
 *
 * RULE-015 graceful degradation: errors are collected and returned so
 * the pipeline keeps going. Only runs when there is at least one
 * kernpunt or vervolgstap.
 */
export async function runTagAndSegmentStep(
  input: TagAndSegmentInput,
): Promise<TagAndSegmentResult> {
  const errors: string[] = [];

  if (input.kernpunten.length === 0 && input.vervolgstappen.length === 0) {
    return { segmentsSaved: 0, errors };
  }

  try {
    const ignoredNames = input.organizationId
      ? await getIgnoredEntityNames(input.organizationId, "project")
      : new Set<string>();

    const taggerOutput = runTagger({
      kernpunten: input.kernpunten,
      vervolgstappen: input.vervolgstappen,
      identified_projects: input.identifiedProjects,
      knownProjects: input.knownProjects,
      ignoredNames,
    });

    const segments = buildSegments(taggerOutput);
    if (segments.length === 0) {
      console.info(`Tagger: 0 segments saved for meeting ${input.meetingId}`);
      return { segmentsSaved: 0, errors };
    }

    const segmentRows = segments.map((s) => ({
      meeting_id: input.meetingId,
      project_id: s.project_id,
      project_name_raw: s.project_name_raw,
      kernpunten: s.kernpunten,
      vervolgstappen: s.vervolgstappen,
      summary_text: s.summary_text,
    }));

    const insertSegResult = await insertMeetingProjectSummaries(segmentRows);
    if ("error" in insertSegResult) {
      errors.push(`Segments insert: ${insertSegResult.error}`);
      return { segmentsSaved: 0, errors };
    }

    const segmentsSaved = insertSegResult.ids.length;

    try {
      const texts = segments.map((s) => s.summary_text);
      const embeddings = await embedBatch(texts);
      await Promise.all(
        insertSegResult.ids.map((id, i) => updateSegmentEmbedding(id, embeddings[i])),
      );
    } catch (embedErr) {
      const msg = embedErr instanceof Error ? embedErr.message : String(embedErr);
      console.error("Segment embedding failed (non-blocking):", msg);
      errors.push(`Segment embedding: ${msg}`);
    }

    console.info(`Tagger: ${segmentsSaved} segments saved for meeting ${input.meetingId}`);
    return { segmentsSaved, errors };
  } catch (taggerErr) {
    const msg = taggerErr instanceof Error ? taggerErr.message : String(taggerErr);
    console.error("Tagger failed (graceful degradation):", msg);
    errors.push(`Tagger: ${msg}`);
    return { segmentsSaved: 0, errors };
  }
}
