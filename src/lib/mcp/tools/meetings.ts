import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";

export function registerMeetingTools(server: McpServer) {
  server.tool(
    "get_meeting_summary",
    "Haal de volledige samenvatting, extracties en deelnemers op voor een specifieke meeting. Gebruik het meeting ID uit zoekresultaten, of zoek op titel.",
    {
      meeting_id: z.string().optional().describe("UUID of the meeting (from search results)"),
      title_search: z.string().optional().describe("Search meetings by title (partial match)"),
    },
    async ({ meeting_id, title_search }) => {
      const supabase = getAdminClient();

      let query = supabase.from("meetings").select(
        `id, title, date, participants, summary, meeting_type, party_type,
           relevance_score,
           organization:organization_id (name),
           unmatched_organization_name`,
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

      const { data: meetings, error } = await query.limit(5);

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
          // Haal alle extracties op voor deze meeting
          const { data: extractions } = await supabase
            .from("extractions")
            .select("type, content, confidence, transcript_ref")
            .eq("meeting_id", m.id)
            .order("type")
            .order("confidence", { ascending: false });

          const orgName = m.organization?.name || m.unmatched_organization_name || "Onbekend";
          const dateStr = m.date ? new Date(m.date).toLocaleDateString("nl-NL") : "Onbekend";

          const sections: string[] = [
            `## ${m.title}`,
            `**Datum:** ${dateStr}`,
            `**Deelnemers:** ${m.participants?.join(", ") || "Onbekend"}`,
            `**Type:** ${m.meeting_type || "Niet geclassificeerd"} | **Partij:** ${m.party_type || "Onbekend"}`,
            `**Organisatie:** ${orgName}`,
            `**Relevantie:** ${m.relevance_score?.toFixed(2) || "N/A"}`,
            "",
            `### Samenvatting`,
            m.summary || "Geen samenvatting beschikbaar.",
          ];

          if (extractions && extractions.length > 0) {
            const grouped: Record<string, typeof extractions> = {};
            for (const e of extractions) {
              if (!grouped[e.type]) grouped[e.type] = [];
              grouped[e.type].push(e);
            }

            const typeLabels: Record<string, string> = {
              decision: "Besluiten",
              action_item: "Actiepunten",
              insight: "Inzichten",
              need: "Behoeften",
            };

            for (const [type, items] of Object.entries(grouped)) {
              const label = typeLabels[type] || type;
              sections.push("", `### ${label}`);
              items.forEach((item, i) => {
                const conf =
                  item.confidence != null ? ` (${Math.round(item.confidence * 100)}%)` : "";
                sections.push(`${i + 1}. ${item.content}${conf}`);
              });
            }
          } else {
            sections.push("", "Nog geen extracties beschikbaar.");
          }

          sections.push("", `**Meeting ID:** ${m.id}`);
          return sections.join("\n");
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
