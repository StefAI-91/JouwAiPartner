import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";

export function registerDecisionTools(server: McpServer) {
  server.tool(
    "get_decisions",
    "Haal besluiten op, optioneel gefilterd op project of datumbereik.",
    {
      project: z.string().optional().describe("Filter by project name"),
      date_from: z.string().optional().describe("Start date (ISO format, e.g. 2026-03-01)"),
      date_to: z.string().optional().describe("End date (ISO format, e.g. 2026-03-31)"),
    },
    async ({ project, date_from, date_to }) => {
      const supabase = getAdminClient();

      let query = supabase
        .from("decisions")
        .select(
          `
          id, decision, context, made_by, date, status,
          source_type, source_id, project_id,
          projects:project_id (name)
        `,
        )
        .eq("status", "active")
        .order("date", { ascending: false });

      if (date_from) {
        query = query.gte("date", date_from);
      }
      if (date_to) {
        query = query.lte("date", date_to);
      }

      const { data: decisions, error } = await query.limit(50);

      if (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      }

      if (!decisions || decisions.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Geen besluiten gevonden met deze filters.",
            },
          ],
        };
      }

      let filtered = decisions;
      if (project) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filtered = decisions.filter((d: any) =>
          d.projects?.name?.toLowerCase().includes(project.toLowerCase()),
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = filtered.map((d: any, i: number) => {
        const projectName = d.projects?.name || "geen project";
        const dateStr = d.date ? new Date(d.date).toLocaleDateString("nl-NL") : "onbekende datum";
        return `${i + 1}. **${d.decision}**\n   Door: ${d.made_by || "onbekend"} | Datum: ${dateStr} | Project: ${projectName}\n   Bron: ${d.source_type} (${d.source_id})`;
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `${filtered.length} besluiten gevonden:\n\n${formatted.join("\n\n")}`,
          },
        ],
      };
    },
  );
}
