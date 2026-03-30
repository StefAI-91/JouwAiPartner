import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import { formatVerificatieStatus } from "./utils";

export function registerActionTools(server: McpServer) {
  server.tool(
    "get_action_items",
    "Haal actiepunten op uit meetings met eigenaar, deadline, bronvermelding (meeting, datum, citaat), confidence score en verificatie-status. Optioneel gefilterd op persoon of project.",
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

      const query = supabase
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

      let filtered = items;
      if (person) {
        const lowerPerson = person.toLowerCase();
        filtered = filtered.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase join type
          (item: any) =>
            item.content?.toLowerCase().includes(lowerPerson) ||
            item.metadata?.assignee?.toLowerCase().includes(lowerPerson),
        );
      }
      if (project) {
        filtered = filtered.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase join type
          (item: any) =>
            item.project?.name?.toLowerCase().includes(project.toLowerCase()) ||
            item.meeting?.title?.toLowerCase().includes(project.toLowerCase()),
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = filtered.map((item: any, i: number) => {
        const meeting = item.meeting;
        const dateStr = meeting?.date
          ? new Date(meeting.date).toLocaleDateString("nl-NL")
          : "onbekende datum";
        const projectName = item.project?.name || item.organization?.name || "geen project";
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
