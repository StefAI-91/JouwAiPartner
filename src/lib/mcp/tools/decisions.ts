import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import { formatVerificatieStatus } from "./utils";

export function registerDecisionTools(server: McpServer) {
  server.tool(
    "get_decisions",
    "Haal besluiten op uit meetings met bronvermelding (meeting, datum, citaat), confidence score en verificatie-status. Optioneel gefilterd op project of datumbereik.",
    {
      project: z.string().optional().describe("Filter by project name"),
      date_from: z.string().optional().describe("Start date (ISO format, e.g. 2026-03-01)"),
      date_to: z.string().optional().describe("End date (ISO format, e.g. 2026-03-31)"),
      limit: z.number().optional().default(20).describe("Max results (default 20)"),
    },
    async ({ project, date_from, date_to, limit }) => {
      const supabase = getAdminClient();

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
        .eq("type", "decision")
        .order("created_at", { ascending: false });

      if (date_from) {
        query = query.gte("created_at", date_from);
      }
      if (date_to) {
        query = query.lte("created_at", date_to);
      }

      const { data: decisions, error } = await query.limit(limit);

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
        filtered = decisions.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase join type
          (d: any) =>
            d.project?.name?.toLowerCase().includes(project.toLowerCase()) ||
            d.meeting?.title?.toLowerCase().includes(project.toLowerCase()),
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = filtered.map((d: any, i: number) => {
        const meeting = d.meeting;
        const dateStr = meeting?.date
          ? new Date(meeting.date).toLocaleDateString("nl-NL")
          : "onbekende datum";
        const projectName = d.project?.name || d.organization?.name || "geen project";
        const status = formatVerificatieStatus(d.confidence, d.corrected_by);
        const madeBy = d.metadata?.made_by;

        return [
          `${i + 1}. **${d.content}**`,
          `   ${status || ""}`,
          madeBy ? `   Besluit door: ${madeBy}` : null,
          `   Meeting: ${meeting?.title || "onbekend"} | Datum: ${dateStr}`,
          `   Project: ${projectName}`,
          d.transcript_ref ? `   Citaat: "${d.transcript_ref}"` : null,
        ]
          .filter(Boolean)
          .join("\n");
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
