import type { MeetingStructurerOutput, Kernpunt } from "../validations/meeting-structurer";
import { TYPE_MARKDOWN_LABEL } from "../extraction-types";

/**
 * Deterministic renderer that turns structured `MeetingStructurerOutput`
 * into the same markdown shape that legacy `formatSummary()` emits.
 *
 * Why: downstream consumers (segment-builder, embed-pipeline, MCP tools,
 * UI markdown-parsers) read `summary.content` as markdown today. By
 * keeping the markdown shape identical, the new agent can swap in
 * behind a feature flag without touching any consumer.
 *
 * Pure function — no IO, no AI calls — so it is safe to snapshot-test.
 */
export function renderMeetingSummary(output: MeetingStructurerOutput): string {
  const sections: string[] = [];

  const kernpuntenMarkdown = renderKernpunten(output.kernpunten);
  if (kernpuntenMarkdown) {
    sections.push("## Kernpunten\n" + kernpuntenMarkdown);
  }

  const deelnemerLines = output.deelnemers.map((d) => {
    const parts = [`**${d.name}**`];
    if (d.role) parts.push(d.role);
    if (d.organization) parts.push(d.organization);
    if (d.stance) parts.push(`(${d.stance})`);
    return `- ${parts.join(" — ")}`;
  });
  if (deelnemerLines.length > 0) {
    sections.push("## Deelnemers\n" + deelnemerLines.join("\n"));
  }

  const vervolgstappen = renderVervolgstappen(output.kernpunten);
  if (vervolgstappen) {
    sections.push("## Vervolgstappen\n" + vervolgstappen);
  }

  return sections.join("\n\n");
}

/**
 * Build the legacy-shape `kernpunten: string[]` that the tagger consumes.
 * Interleaves `### [Project] Theme` headers with `**Label:** content` (or
 * bare) bullets so the tagger's existing parser keeps working unchanged.
 *
 * Action items are excluded — they belong in `vervolgstappen`.
 */
export function buildLegacyKernpunten(kernpunten: Kernpunt[]): string[] {
  const items = kernpunten.filter((k) => k.type !== "action_item");
  if (items.length === 0) return [];

  const groupKeyOrder: string[] = [];
  const groups = new Map<string, { project: string; theme: string; items: Kernpunt[] }>();

  for (const k of items) {
    const project = k.theme_project?.trim() || "Algemeen";
    const theme = k.theme?.trim() ?? "";
    const key = `${project}::${theme}`;
    if (!groups.has(key)) {
      groupKeyOrder.push(key);
      groups.set(key, { project, theme, items: [] });
    }
    groups.get(key)!.items.push(k);
  }

  const lines: string[] = [];
  for (const key of groupKeyOrder) {
    const group = groups.get(key)!;
    lines.push(group.theme ? `### [${group.project}] ${group.theme}` : `### [${group.project}]`);
    for (const item of group.items) {
      lines.push(formatBullet(item));
    }
  }
  return lines;
}

/**
 * Build the legacy-shape `vervolgstappen: string[]` from action_item
 * kernpunten. Format: `[Project] content — assignee, deadline`. Matches
 * the summarizer's current output so the tagger can parse them.
 */
export function buildLegacyVervolgstappen(kernpunten: Kernpunt[]): string[] {
  return kernpunten
    .filter((k) => k.type === "action_item")
    .map((k) => {
      const meta = k.metadata as {
        assignee?: string | null;
        deadline?: string | null;
        suggested_deadline?: string | null;
      };
      const projectPrefix = k.project?.trim() || "Algemeen";
      const trailingParts: string[] = [];
      if (meta.assignee) trailingParts.push(meta.assignee);
      const date = meta.deadline ?? meta.suggested_deadline;
      if (date) trailingParts.push(date);
      const trailing = trailingParts.length > 0 ? ` — ${trailingParts.join(", ")}` : "";
      return `[${projectPrefix}] ${k.content}${trailing}`;
    });
}

/**
 * Render the kernpunten section. Groups items by `(theme_project, theme)`
 * preserving first-seen order, emits a `### [Project] Theme` header per
 * group, and a `- **Label:** content` (or bare `- content`) per item.
 *
 * Action items are skipped here — they appear in the Vervolgstappen
 * section to mirror legacy formatSummary().
 */
function renderKernpunten(kernpunten: Kernpunt[]): string {
  const items = kernpunten.filter((k) => k.type !== "action_item");
  if (items.length === 0) return "";

  const groupKeyOrder: string[] = [];
  const groups = new Map<string, { project: string; theme: string; items: Kernpunt[] }>();

  for (const k of items) {
    const project = k.theme_project?.trim() || "Algemeen";
    const theme = k.theme?.trim() ?? "";
    const key = `${project}::${theme}`;
    if (!groups.has(key)) {
      groupKeyOrder.push(key);
      groups.set(key, { project, theme, items: [] });
    }
    groups.get(key)!.items.push(k);
  }

  // Mirror legacy formatSummary: blank line BEFORE every `###` header
  // (the leading `\n` produces the blank line between `## Kernpunten`
  // and the first `###`, and between consecutive groups).
  const lines: string[] = [];
  for (const key of groupKeyOrder) {
    const group = groups.get(key)!;
    const headerText = group.theme
      ? `### [${group.project}] ${group.theme}`
      : `### [${group.project}]`;
    lines.push("\n" + headerText);
    for (const item of group.items) {
      lines.push(`- ${formatBullet(item)}`);
    }
  }

  return lines.join("\n");
}

function formatBullet(item: Kernpunt): string {
  const label = TYPE_MARKDOWN_LABEL[item.type];
  if (!label) return item.content;
  return `**${label}:** ${item.content}`;
}

/**
 * Convert action_item kernpunten to legacy-style vervolgstap lines.
 * Format: `- [ ] [Project] content — assignee, deadline` matching the
 * shape that `formatSummary()` emits today.
 */
function renderVervolgstappen(kernpunten: Kernpunt[]): string {
  const actionItems = kernpunten.filter((k) => k.type === "action_item");
  if (actionItems.length === 0) return "";

  return actionItems
    .map((k) => {
      const meta = k.metadata as {
        assignee?: string | null;
        deadline?: string | null;
        suggested_deadline?: string | null;
      };
      const projectPrefix = k.project?.trim() || "Algemeen";
      const trailingParts: string[] = [];
      if (meta.assignee) trailingParts.push(meta.assignee);
      const date = meta.deadline ?? meta.suggested_deadline;
      if (date) trailingParts.push(date);
      const trailing = trailingParts.length > 0 ? ` — ${trailingParts.join(", ")}` : "";
      return `- [ ] [${projectPrefix}] ${k.content}${trailing}`;
    })
    .join("\n");
}
