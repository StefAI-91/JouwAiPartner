import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@repo/database/supabase/admin";
import { findPersonIdsByName } from "@repo/database/queries/people";
import {
  formatVerificatieStatus,
  lookupProfileNames,
  collectVerifiedByIds,
  resolveProjectIds,
} from "./utils";
import { trackMcpQuery } from "./usage-tracking";

/**
 * Format a task row for MCP output.
 */
function formatTask(
  task: {
    title: string;
    status: string;
    assigned_person: { name: string; team: string | null } | null;
    due_date: string | null;
    completed_at: string | null;
  },
  index: number,
): string {
  const assignee = task.assigned_person
    ? `${task.assigned_person.name}${task.assigned_person.team ? ` (${task.assigned_person.team})` : " (klant)"}`
    : null;
  const statusLabel = task.status === "done" ? "Afgerond" : "Actief";

  return [
    `${index + 1}. **${task.title}**`,
    `   Status: ${statusLabel}`,
    assignee ? `   Eigenaar: ${assignee}` : null,
    task.due_date ? `   Deadline: ${task.due_date}` : null,
    task.completed_at
      ? `   Afgerond: ${new Date(task.completed_at).toLocaleDateString("nl-NL")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Format an action item for MCP output.
 */
function formatActionItem(
  item: {
    content: string;
    verification_status: string | null;
    verified_by: string | null;
    verified_at: string | null;
    confidence: number | null;
    corrected_by: string | null;
    metadata: { assignee?: string; deadline?: string } | null;
    meeting: { title: string; date: string | null } | null;
    project: { name: string } | null;
    organization: { name: string } | null;
    transcript_ref: string | null;
  },
  index: number,
  profileMap: Record<string, string>,
): string {
  const dateStr = item.meeting?.date
    ? new Date(item.meeting.date).toLocaleDateString("nl-NL")
    : "onbekende datum";
  const projectName = item.project?.name || item.organization?.name || "geen project";
  const status = formatVerificatieStatus(
    item.verification_status,
    item.verified_by ? profileMap[item.verified_by] || null : null,
    item.verified_at,
    item.confidence,
    item.corrected_by,
  );

  return [
    `${index + 1}. **${item.content}**`,
    `   ${status}`,
    item.metadata?.assignee ? `   Eigenaar: ${item.metadata.assignee}` : null,
    item.metadata?.deadline ? `   Deadline: ${item.metadata.deadline}` : null,
    `   Meeting: ${item.meeting?.title || "onbekend"} | Datum: ${dateStr}`,
    `   Project: ${projectName}`,
    item.transcript_ref ? `   Citaat: "${item.transcript_ref}"` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function registerActionTools(server: McpServer) {
  // ── Tool 1: get_tasks — promoted, actively tracked tasks ──
  server.tool(
    "get_tasks",
    "Haal taken op. Dit zijn gepromoveerde actiepunten uit meetings die actief worden bijgehouden. Filter op persoon, status, deadline-week of afronddatum. Gebruik get_action_items voor alle ruwe actiepunten uit meeting extracties.",
    {
      person: z.string().max(255).optional().describe("Filter by assigned person name"),
      status: z
        .enum(["active", "done", "all"])
        .optional()
        .default("active")
        .describe("Task status filter (default: active)"),
      due_from: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe(
          "Filter tasks with due_date >= this date (YYYY-MM-DD). Useful for 'what is due this week?'",
        ),
      due_to: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Filter tasks with due_date <= this date (YYYY-MM-DD)"),
      completed_from: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe(
          "Filter done tasks completed on or after this date (YYYY-MM-DD). Useful for 'what was done last week?'",
        ),
      completed_to: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Filter done tasks completed on or before this date (YYYY-MM-DD)"),
      limit: z.number().optional().default(20).describe("Max results (default 20)"),
    },
    async ({ person, status, due_from, due_to, completed_from, completed_to, limit }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(
        supabase,
        "get_tasks",
        [person, status, due_from, due_to, completed_from, completed_to]
          .filter(Boolean)
          .join(", ") || "all",
      );

      let query = supabase
        .from("tasks")
        .select(
          `id, title, status, due_date, assigned_to, completed_at, created_at,
           assigned_person:assigned_to (id, name, team)`,
        )
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (status === "active") {
        query = query.eq("status", "active");
      } else if (status === "done") {
        query = query.eq("status", "done");
      } else {
        query = query.in("status", ["active", "done"]);
      }

      if (person) {
        const personIds = await findPersonIdsByName(person);
        if (personIds.length === 0) {
          return {
            content: [{ type: "text" as const, text: `Geen persoon gevonden voor "${person}".` }],
          };
        }
        query = query.in("assigned_to", personIds);
      }

      if (due_from) {
        query = query.gte("due_date", due_from);
      }
      if (due_to) {
        query = query.lte("due_date", due_to);
      }
      if (completed_from) {
        query = query.gte("completed_at", `${completed_from}T00:00:00Z`);
      }
      if (completed_to) {
        query = query.lte("completed_at", `${completed_to}T23:59:59Z`);
      }

      const { data: tasks, error } = await query.limit(limit);

      if (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }

      if (!tasks || tasks.length === 0) {
        return { content: [{ type: "text" as const, text: "Geen taken gevonden." }] };
      }

      const typedTasks = tasks as unknown as {
        title: string;
        status: string;
        assigned_person: { name: string; team: string | null } | null;
        due_date: string | null;
        completed_at: string | null;
      }[];

      const formatted = typedTasks.map(formatTask);

      return {
        content: [
          {
            type: "text" as const,
            text: `${typedTasks.length} taken gevonden:\n\n${formatted.join("\n\n")}`,
          },
        ],
      };
    },
  );

  // ── Tool 2: get_action_items — raw extraction data from meetings ──
  server.tool(
    "get_action_items",
    "Haal ruwe actiepunten op uit meeting extracties. Dit zijn AI-geëxtraheerde items die mogelijk nog niet gepromoveerd zijn tot actieve taken. Gebruik get_tasks voor actief bijgehouden taken.",
    {
      person: z
        .string()
        .max(255)
        .optional()
        .describe("Filter by person name (matches assignee in metadata or content)"),
      project: z.string().max(255).optional().describe("Filter by project name"),
      limit: z.number().optional().default(20).describe("Max results (default 20)"),
      include_drafts: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include unverified (draft) content. Only for internal review purposes."),
    },
    async ({ person, project, limit, include_drafts }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(
        supabase,
        "get_action_items",
        [person, project].filter(Boolean).join(", ") || "all",
      );

      const escapeLike = (s: string) => s.replace(/%/g, "\\%").replace(/_/g, "\\_");

      let query = supabase
        .from("extractions")
        .select(
          `id, content, confidence, transcript_ref, metadata,
          corrected_by, corrected_at, created_at,
          verification_status, verified_by, verified_at,
          meeting:meeting_id (id, title, date, participants),
          organization:organization_id (name),
          project:project_id (name)`,
        )
        .eq("type", "action_item")
        .order("created_at", { ascending: false });

      if (!include_drafts) {
        query = query.eq("verification_status", "verified");
      }

      if (person) {
        const escaped = escapeLike(person);
        query = query.or(`content.ilike.%${escaped}%,metadata->>assignee.ilike.%${escaped}%`);
      }

      if (project) {
        const projectIds = await resolveProjectIds(supabase, project);
        if (!projectIds) {
          return {
            content: [{ type: "text" as const, text: `Geen project gevonden voor "${project}".` }],
          };
        }
        query = query.in("project_id", projectIds);
      }

      const { data: items, error } = await query.limit(limit);

      if (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }

      if (!items || items.length === 0) {
        return {
          content: [{ type: "text" as const, text: "Geen actiepunten gevonden met deze filters." }],
        };
      }

      const typedItems = items as unknown as {
        content: string;
        confidence: number | null;
        transcript_ref: string | null;
        metadata: { assignee?: string; deadline?: string } | null;
        corrected_by: string | null;
        verification_status: string | null;
        verified_by: string | null;
        verified_at: string | null;
        meeting: { title: string; date: string | null } | null;
        organization: { name: string } | null;
        project: { name: string } | null;
      }[];

      const profileMap = await lookupProfileNames(supabase, collectVerifiedByIds(typedItems));
      const formatted = typedItems.map((item, i) => formatActionItem(item, i, profileMap));

      return {
        content: [
          {
            type: "text" as const,
            text: `${typedItems.length} actiepunten gevonden:\n\n${formatted.join("\n\n")}`,
          },
        ],
      };
    },
  );
}
