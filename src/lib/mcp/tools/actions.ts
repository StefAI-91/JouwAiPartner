import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";

export function registerActionTools(server: McpServer) {
  server.tool(
    "get_action_items",
    "Haal actiepunten op, optioneel gefilterd op eigenaar, status of project.",
    {
      assignee: z.string().optional().describe("Filter by assignee name (partial match)"),
      status: z.enum(["open", "in_progress", "done"]).optional().describe("Filter by status"),
      project: z.string().optional().describe("Filter by project name"),
    },
    async ({ assignee, status, project }) => {
      const supabase = getAdminClient();

      let query = supabase
        .from("action_items")
        .select(
          `
          id, description, assignee, due_date, scope, status,
          source_type, source_id, project_id,
          projects:project_id (name)
        `,
        )
        .order("due_date", { ascending: true, nullsFirst: false });

      if (assignee) {
        query = query.ilike("assignee", `%${assignee}%`);
      }
      if (status) {
        query = query.eq("status", status);
      }
      if (project) {
        query = query.not("project_id", "is", null);
      }

      const { data: items, error } = await query.limit(50);

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

      let filtered = items;
      if (project) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filtered = items.filter((item: any) =>
          item.projects?.name?.toLowerCase().includes(project.toLowerCase()),
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = filtered.map((item: any, i: number) => {
        const projectName = item.projects?.name || "geen project";
        const deadline = item.due_date || "geen deadline";
        return `${i + 1}. **${item.description}**\n   Eigenaar: ${item.assignee || "niemand"} | Deadline: ${deadline} | Status: ${item.status} | Scope: ${item.scope} | Project: ${projectName}`;
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
