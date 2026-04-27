import type { TaggerOutput } from "../tagger";

export interface Segment {
  project_id: string | null;
  project_name_raw: string | null;
  kernpunten: string[];
  vervolgstappen: string[];
  summary_text: string;
}

/**
 * Format summary_text for a segment (used as embedding input).
 */
function formatSummaryText(
  projectName: string | null,
  kernpunten: string[],
  vervolgstappen: string[],
): string {
  const lines: string[] = [];

  if (projectName) {
    lines.push(`Project: ${projectName}`);
  } else {
    lines.push("Algemeen (niet project-specifiek):");
  }

  if (kernpunten.length > 0) {
    lines.push("Kernpunten:");
    for (const k of kernpunten) lines.push(`- ${k}`);
  }

  if (vervolgstappen.length > 0) {
    lines.push("Vervolgstappen:");
    for (const v of vervolgstappen) lines.push(`- ${v}`);
  }

  return lines.join("\n");
}

/**
 * Build segments from tagged items.
 * Groups kernpunten and vervolgstappen per project.
 * Items with project_name=null go to "Algemeen" segment.
 *
 * Returns at least 1 segment (the "Algemeen" segment if nothing else).
 * Skips segments that have no kernpunten and no vervolgstappen.
 */
export function buildSegments(taggerOutput: TaggerOutput): Segment[] {
  // Group by project key (project_name or "@@ALGEMEEN@@")
  const groups = new Map<
    string,
    {
      project_id: string | null;
      project_name_raw: string | null;
      kernpunten: string[];
      vervolgstappen: string[];
    }
  >();

  const GENERAL_KEY = "@@ALGEMEEN@@";

  // Ensure "Algemeen" group always exists
  groups.set(GENERAL_KEY, {
    project_id: null,
    project_name_raw: null,
    kernpunten: [],
    vervolgstappen: [],
  });

  for (const item of taggerOutput.kernpunten) {
    const key = item.project_name ?? GENERAL_KEY;
    if (!groups.has(key)) {
      groups.set(key, {
        project_id: item.project_id,
        project_name_raw: item.project_name,
        kernpunten: [],
        vervolgstappen: [],
      });
    }
    groups.get(key)!.kernpunten.push(item.content);
  }

  for (const item of taggerOutput.vervolgstappen) {
    const key = item.project_name ?? GENERAL_KEY;
    if (!groups.has(key)) {
      groups.set(key, {
        project_id: item.project_id,
        project_name_raw: item.project_name,
        kernpunten: [],
        vervolgstappen: [],
      });
    }
    groups.get(key)!.vervolgstappen.push(item.content);
  }

  // Build segments, skip empty ones (except "Algemeen" which is always kept if it has content)
  const segments: Segment[] = [];
  for (const [, group] of groups) {
    if (group.kernpunten.length === 0 && group.vervolgstappen.length === 0) continue;

    segments.push({
      project_id: group.project_id,
      project_name_raw: group.project_name_raw,
      kernpunten: group.kernpunten,
      vervolgstappen: group.vervolgstappen,
      summary_text: formatSummaryText(
        group.project_name_raw,
        group.kernpunten,
        group.vervolgstappen,
      ),
    });
  }

  // EDGE-006: If no segments at all (empty kernpunten + vervolgstappen), don't create empty rows
  return segments;
}
