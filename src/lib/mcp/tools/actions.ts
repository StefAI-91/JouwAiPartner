import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import type { McpActionItemRow } from "@/lib/types/mcp";
import { escapeLike, formatVerificatieStatus } from "./utils";
import { trackMcpQuery } from "./usage-tracking";

export function registerActionTools(server: McpServer) {
  server.tool(
    "get_action_items",
    "Haal actiepunten (taken, to-dos, afspraken) op uit meetings. Toont eigenaar, deadline, bronvermelding en verificatie-status. Filter op persoon om iemands taken te zien, of op project voor projectspecifieke actiepunten.",
    {
      person: z
        .string()
        .optional()
        .describe("Filter by person name (matches assignee in metadata or content)"),
      project: z.string().optional().describe("Filter by project name"),
      limit: z.number().optional().default(20).describe("Max results (default 20)"),
    },
    async ({ person, project, limit }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(
        supabase,
        "get_action_items",
        [person, project].filter(Boolean).join(", ") || "all",
      );

      let query = supabase
        .from("extractions")
        .select(
          `
          id, content, confidence, transcript_ref, metadata, corrected_by, corrected_at, created_at,
          meeting:meeting_id (id, title, date, participants),
          organization:organization_id (name),
          project:project_id (name)
        `,
        )
        .eq("type", "action_item")
        .order("created_at", { ascending: false });

      // Database-side filtering for person (content or metadata->assignee)
      if (person) {
        const escaped = escapeLike(person);
        query = query.or(`content.ilike.%${escaped}%,metadata->>assignee.ilike.%${escaped}%`);
      }

      // Database-side filtering for project
      if (project) {
        const { data: projects } = await supabase
          .from("projects")
          .select("id")
          .ilike("name", `%${escapeLike(project)}%`);

        if (projects && projects.length > 0) {
          const projectIds = projects.map((p: { id: string }) => p.id);
          query = query.in("project_id", projectIds);
        } else {
          return {
            content: [
              {
                type: "text" as const,
                text: `Geen project gevonden voor "${project}".`,
              },
            ],
          };
        }
      }

      const { data: items, error } = await query.limit(limit);

      if (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      }

      if (!items || items.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Geen actiepunten gevonden met deze filters.",
            },
          ],
        };
      }

      const filtered = items;

      const formatted = filtered.map((item: McpActionItemRow, i: number) => {
        const meeting = Array.isArray(item.meeting) ? item.meeting[0] : item.meeting;
        const dateStr = meeting?.date
          ? new Date(meeting.date).toLocaleDateString("nl-NL")
          : "onbekende datum";
        const projectRow = Array.isArray(item.project) ? item.project[0] : item.project;
        const organizationRow = Array.isArray(item.organization)
          ? item.organization[0]
          : item.organization;
        const projectName = projectRow?.name || organizationRow?.name || "geen project";
        const status = formatVerificatieStatus(item.confidence, item.corrected_by);
        const assignee = item.metadata?.assignee;
        const deadline = item.metadata?.deadline;

        return [
          `${i + 1}. **${item.content}**`,
          `   ${status || ""}`,
          assignee ? `   Eigenaar: ${assignee}` : null,
          deadline ? `   Deadline: ${deadline}` : null,
          `   Meeting: ${meeting?.title || "onbekend"} | Datum: ${dateStr}`,
          `   Project: ${projectName}`,
          item.transcript_ref ? `   Citaat: "${item.transcript_ref}"` : null,
        ]
          .filter(Boolean)
          .join("\n");
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `${filtered.length} actiepunten gevonden:\n\n${formatted.join("\n\n")}`,
          },
        ],
      };
    },
  );
}
