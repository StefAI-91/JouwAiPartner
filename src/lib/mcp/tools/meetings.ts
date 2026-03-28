import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";

export function registerMeetingTools(server: McpServer) {
  server.tool(
    "get_meeting_summary",
    "Haal de volledige samenvatting, actiepunten en deelnemers op voor een specifieke meeting. Gebruik het meeting ID uit zoekresultaten, of zoek op titel.",
    {
      meeting_id: z.string().optional().describe("UUID of the meeting (from search results)"),
      title_search: z.string().optional().describe("Search meetings by title (partial match)"),
    },
    async ({ meeting_id, title_search }) => {
      const supabase = getAdminClient();

      let query = supabase
        .from("meetings")
        .select(
          "id, title, date, participants, summary, transcript, category, relevance_score, project_id",
        );

      if (meeting_id) {
        query = query.eq("id", meeting_id);
      } else if (title_search) {
        query = query.ilike("title", `%${title_search}%`);
      } else {
        return {
          content: [
            {
              type: "text" as const,
              text: "Geef een meeting_id of title_search op.",
            },
          ],
        };
      }

      const { data: meetings, error } = await query.eq("status", "active").limit(5);

      if (error || !meetings || meetings.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: meeting_id
                ? `Meeting ${meeting_id} niet gevonden.`
                : `Geen meetings gevonden voor "${title_search}".`,
            },
          ],
        };
      }

      const formatted = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meetings.map(async (m: any) => {
          const { data: decisions } = await supabase
            .from("decisions")
            .select("decision, made_by")
            .eq("source_id", m.id);

          const { data: actionItems } = await supabase
            .from("action_items")
            .select("description, assignee, due_date, scope, status")
            .eq("source_id", m.id);

          return [
            `## ${m.title}`,
            `**Datum:** ${m.date ? new Date(m.date).toLocaleDateString("nl-NL") : "Onbekend"}`,
            `**Deelnemers:** ${m.participants?.join(", ") || "Onbekend"}`,
            `**Categorieen:** ${m.category?.join(", ") || "Niet gecategoriseerd"}`,
            `**Relevantie:** ${m.relevance_score?.toFixed(2) || "N/A"}`,
            "",
            `### Samenvatting`,
            m.summary || "Geen samenvatting beschikbaar.",
            "",
            `### Besluiten`,
            decisions && decisions.length > 0
              ? decisions
                  .map(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (d: any, i: number) =>
                      `${i + 1}. ${d.decision} (door: ${d.made_by || "onbekend"})`,
                  )
                  .join("\n")
              : "Geen besluiten vastgelegd.",
            "",
            `### Actiepunten`,
            actionItems && actionItems.length > 0
              ? actionItems
                  .map(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (a: any, i: number) =>
                      `${i + 1}. ${a.description} — ${a.assignee || "niemand"} ${a.due_date ? `(deadline: ${a.due_date})` : ""} [${a.status}]`,
                  )
                  .join("\n")
              : "Geen actiepunten vastgelegd.",
            "",
            `**Meeting ID:** ${m.id}`,
          ].join("\n");
        }),
      );

      return {
        content: [
          {
            type: "text" as const,
            text: formatted.join("\n\n---\n\n"),
          },
        ],
      };
    },
  );
}
