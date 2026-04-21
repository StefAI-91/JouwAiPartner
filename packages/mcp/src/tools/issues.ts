import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@repo/database/supabase/admin";
import {
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  ISSUE_TYPE_LABELS,
  ISSUE_TYPES,
  type IssueStatus,
  type IssueType,
} from "@repo/database/constants/issues";
import {
  getIssueDetailForReport,
  getProjectIssuesForReport,
  type IssueActivityReport,
  type IssueReportRow,
} from "@repo/database/queries/reports";
import { trackMcpQuery } from "./usage-tracking";

/**
 * MCP-tools voor issues. Samen met `project-report.ts` vormen ze de data-laag
 * waarmee Claude Desktop een project-rapport genereert. `get_project_issues`
 * levert de lijst (gegroepeerd per status), `get_issue_detail` de volledige
 * diepte voor één issue inclusief comments en activity-log.
 */

// ────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("nl-NL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function humanType(type: string): string {
  return ISSUE_TYPE_LABELS[type as IssueType] ?? type;
}

function humanStatus(status: string): string {
  return ISSUE_STATUS_LABELS[status as IssueStatus] ?? status;
}

function humanPriority(priority: string): string {
  return ISSUE_PRIORITY_LABELS[priority as keyof typeof ISSUE_PRIORITY_LABELS] ?? priority;
}

/**
 * Vertaalt één activity-event naar een leesbare regel. `field`-changes krijgen
 * "old → new" formatting, andere acties blijven kort ("created", "classified").
 */
function formatActivityLine(event: IssueActivityReport): string {
  const when = formatDateTime(event.created_at);
  const who = event.actor_name ?? "Systeem";

  if (event.field && event.old_value !== null && event.new_value !== null) {
    return `- ${when} · **${who}** · ${event.field}: ${event.old_value} → ${event.new_value}`;
  }
  if (event.field && event.new_value !== null) {
    return `- ${when} · **${who}** · ${event.field} gezet op ${event.new_value}`;
  }
  return `- ${when} · **${who}** · ${event.action}`;
}

/**
 * Statussen in workflow-volgorde voor groepering in de rapport-output. Laatste
 * twee (done, cancelled) komen na de actieve statussen zodat een lezer eerst
 * ziet waar nu aan gewerkt wordt.
 */
const STATUS_DISPLAY_ORDER: IssueStatus[] = [
  "triage",
  "backlog",
  "todo",
  "in_progress",
  "done",
  "cancelled",
];

function groupIssuesByStatus(issues: IssueReportRow[]): Map<string, IssueReportRow[]> {
  const grouped = new Map<string, IssueReportRow[]>();
  for (const status of STATUS_DISPLAY_ORDER) {
    grouped.set(status, []);
  }
  for (const issue of issues) {
    const bucket = grouped.get(issue.status) ?? [];
    bucket.push(issue);
    grouped.set(issue.status, bucket);
  }
  return grouped;
}

function formatIssueBlock(issue: IssueReportRow, includeDescription: boolean): string {
  const lines: string[] = [];
  lines.push(`### #${issue.issue_number}: ${issue.title}`);

  const meta: string[] = [
    `Type: ${humanType(issue.type)}`,
    `Priority: ${humanPriority(issue.priority)}`,
  ];
  if (issue.severity) meta.push(`Severity: ${issue.severity}`);
  if (issue.component) meta.push(`Component: ${issue.component}`);
  lines.push(`- ${meta.join(" | ")}`);

  const reporterLabel = issue.reporter_name
    ? `${issue.reporter_name}${issue.reporter_email ? ` (${issue.reporter_email})` : ""}`
    : (issue.reporter_email ?? "Onbekend");
  const assignedLabel = issue.assigned_to_name ?? "Niemand";
  lines.push(`- Reporter: ${reporterLabel} | Assigned: ${assignedLabel}`);

  const dateLine: string[] = [
    `Aangemaakt: ${formatDate(issue.created_at)}`,
    `Laatst bewerkt: ${formatDate(issue.updated_at)}`,
  ];
  dateLine.push(`Gesloten: ${issue.closed_at ? formatDate(issue.closed_at) : "—"}`);
  lines.push(`- ${dateLine.join(" | ")}`);

  lines.push(`- Bron: ${issue.source}`);

  if (issue.labels.length > 0) {
    lines.push(`- Labels: ${issue.labels.join(", ")}`);
  }

  if (includeDescription && issue.description) {
    lines.push("");
    lines.push("**Beschrijving:**");
    lines.push(issue.description);
  }

  return lines.join("\n");
}

// ────────────────────────────────────────────────────────────────────────────
// Tool registration
// ────────────────────────────────────────────────────────────────────────────

export function registerIssueTools(server: McpServer) {
  server.tool(
    "get_project_issues",
    "Haal issues op voor een project binnen een tijdvenster (default 14 dagen). Gebruikt OR-logica op created_at/updated_at/closed_at zodat recent afgeronde issues ook in beeld komen. Output is markdown, gegroepeerd per status. Retourneert standaard 25 issues per call — bij drukke projecten paginaar je door met `offset` (bv. 0, 25, 50…). De response eindigt met een `NEXT_PAGE:`-regel zolang er meer issues zijn. Filter optioneel op status of type.",
    {
      project_id: z.string().uuid().describe("UUID van het project"),
      days_back: z
        .number()
        .int()
        .min(1)
        .max(365)
        .optional()
        .default(14)
        .describe("Aantal dagen terug vanaf nu. Default 14."),
      status: z
        .enum(ISSUE_STATUSES)
        .optional()
        .describe("Filter op interne status: triage, backlog, todo, in_progress, done, cancelled"),
      type: z
        .enum(ISSUE_TYPES)
        .optional()
        .describe("Filter op issue-type: bug, feature_request, question"),
      include_description: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          "Descriptions meenemen in output. Zet op false bij brede queries om tokens te besparen.",
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .default(25)
        .describe(
          "Aantal issues per pagina. Default 25 — verhoog alleen als je zeker weet dat het binnen het token-budget past.",
        ),
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .default(0)
        .describe(
          "Startpositie voor paginering. Call opnieuw met offset = vorige_offset + limit tot er geen NEXT_PAGE meer is.",
        ),
    },
    async ({ project_id, days_back, status, type, include_description, limit, offset }) => {
      const supabase = getAdminClient();
      const trackQuery = [
        project_id,
        `days=${days_back}`,
        status ? `status=${status}` : null,
        type ? `type=${type}` : null,
        `offset=${offset}`,
        `limit=${limit}`,
      ]
        .filter(Boolean)
        .join(" ");
      await trackMcpQuery(supabase, "get_project_issues", trackQuery);

      const { rows: issues, totalCount } = await getProjectIssuesForReport(
        project_id,
        days_back,
        { status, type, limit, offset },
        supabase,
      );

      if (issues.length === 0) {
        const filterDesc = [status ? `status=${status}` : null, type ? `type=${type}` : null]
          .filter(Boolean)
          .join(", ");
        return {
          content: [
            {
              type: "text" as const,
              text: `Geen issues gevonden voor project ${project_id} in het venster van ${days_back} dagen${filterDesc ? ` (${filterDesc})` : ""}.`,
            },
          ],
        };
      }

      const grouped = groupIssuesByStatus(issues);
      const pageCount = issues.length;
      const activeCount = issues.filter(
        (i) => i.status !== "done" && i.status !== "cancelled",
      ).length;
      const doneCount = issues.filter((i) => i.status === "done").length;
      const cancelledCount = issues.filter((i) => i.status === "cancelled").length;

      const sections: string[] = [];
      sections.push(`# Issues voor project (laatste ${days_back} dagen)`);

      const rangeStart = offset + 1;
      const rangeEnd = offset + pageCount;
      sections.push(
        `Pagina: issues ${rangeStart}-${rangeEnd} van ${totalCount} — ${activeCount} actief, ${doneCount} afgerond, ${cancelledCount} geannuleerd (op deze pagina)`,
      );

      for (const status of STATUS_DISPLAY_ORDER) {
        const bucket = grouped.get(status) ?? [];
        if (bucket.length === 0) continue;

        sections.push(`## ${humanStatus(status)} (${bucket.length})`);
        for (const issue of bucket) {
          sections.push(formatIssueBlock(issue, include_description));
        }
      }

      const nextOffset = offset + pageCount;
      if (nextOffset < totalCount) {
        sections.push(
          `---\nNEXT_PAGE: er zijn nog ${totalCount - nextOffset} issues. Roep \`get_project_issues\` opnieuw aan met \`offset: ${nextOffset}\` (zelfde project_id, days_back en filters) om door te bladeren.`,
        );
      } else {
        sections.push(`---\nEINDE: alle ${totalCount} issues zijn opgehaald.`);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: sections.join("\n\n"),
          },
        ],
      };
    },
  );

  server.tool(
    "get_issue_detail",
    "Haal één issue op met alle metadata, comments en de volledige activity-log. Gebruik dit om diepgang te krijgen op een saillant issue uit get_project_issues (bijv. urgent, hoge impact, of veel beweging). Niet voor alle issues tegelijk — dat overschrijdt context.",
    {
      issue_id: z.string().uuid().describe("UUID van het issue"),
    },
    async ({ issue_id }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(supabase, "get_issue_detail", issue_id);

      const issue = await getIssueDetailForReport(issue_id, supabase);

      if (!issue) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Issue ${issue_id} niet gevonden.`,
            },
          ],
        };
      }

      const projectLabel = issue.project
        ? `${issue.project.name}${issue.project.organization_name ? ` (${issue.project.organization_name})` : ""}`
        : "Onbekend project";

      const reporterLabel = issue.reporter_name
        ? `${issue.reporter_name}${issue.reporter_email ? ` (${issue.reporter_email})` : ""}`
        : (issue.reporter_email ?? "Onbekend");
      const assignedLabel = issue.assigned_to_name ?? "Niemand";

      const sections: string[] = [];
      sections.push(`# Issue #${issue.issue_number}: ${issue.title}`);

      const metaLines: string[] = [
        `**Project:** ${projectLabel}`,
        `**Type:** ${humanType(issue.type)} | **Status:** ${humanStatus(issue.status)} | **Priority:** ${humanPriority(issue.priority)}`,
      ];
      if (issue.component || issue.severity) {
        const tech: string[] = [];
        if (issue.component) tech.push(`**Component:** ${issue.component}`);
        if (issue.severity) tech.push(`**Severity:** ${issue.severity}`);
        metaLines.push(tech.join(" | "));
      }
      metaLines.push(`**Reporter:** ${reporterLabel}`);
      metaLines.push(`**Assigned:** ${assignedLabel}`);
      metaLines.push(
        `**Aangemaakt:** ${formatDateTime(issue.created_at)} | **Laatst bewerkt:** ${formatDateTime(issue.updated_at)}`,
      );
      if (issue.closed_at) {
        metaLines.push(`**Gesloten:** ${formatDateTime(issue.closed_at)}`);
      }
      metaLines.push(
        `**Bron:** ${issue.source}${issue.source_url ? ` | **Source URL:** ${issue.source_url}` : ""}`,
      );
      if (issue.labels.length > 0) {
        metaLines.push(`**Labels:** ${issue.labels.join(", ")}`);
      }
      sections.push(metaLines.join("\n"));

      if (issue.description) {
        sections.push("## Beschrijving");
        sections.push(issue.description);
      }

      sections.push(`## Comments (${issue.comments.length})`);
      if (issue.comments.length === 0) {
        sections.push("Geen comments.");
      } else {
        for (const comment of issue.comments) {
          sections.push(`### ${comment.author_name} — ${formatDateTime(comment.created_at)}`);
          sections.push(comment.body);
        }
      }

      sections.push(`## Activity (${issue.activity.length})`);
      if (issue.activity.length === 0) {
        sections.push("Geen activity.");
      } else {
        sections.push(issue.activity.map(formatActivityLine).join("\n"));
      }

      return {
        content: [
          {
            type: "text" as const,
            text: sections.join("\n\n"),
          },
        ],
      };
    },
  );
}
