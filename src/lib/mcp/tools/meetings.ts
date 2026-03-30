import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import type { McpMeetingRow, McpExtractionRow } from "@/lib/types/mcp";
import { escapeLike, formatVerificatieStatus } from "./utils";
import { trackMcpQuery } from "./usage-tracking";

export function registerMeetingTools(server: McpServer) {
  server.tool(
    "get_meeting_summary",
    "Haal de volledige samenvatting op voor een specifieke meeting: metadata, deelnemers, en alle extracties (besluiten, actiepunten, inzichten, behoeften) met bronvermelding. Gebruik meeting ID uit zoekresultaten of list_meetings, of zoek op titel. Voor het filteren/zoeken van meetings gebruik list_meetings.",
    {
      meeting_id: z
        .string()
        .optional()
        .describe("UUID of the meeting (from search results or list_meetings)"),
      title_search: z.string().optional().describe("Search meetings by title (partial match)"),
    },
    async ({ meeting_id, title_search }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(supabase, "get_meeting_summary", meeting_id || title_search || "");

      let query = supabase.from("meetings").select(
        `id, title, date, participants, summary, meeting_type, party_type,
           relevance_score,
           organization:organization_id (name),
           unmatched_organization_name`,
      );

      if (meeting_id) {
        query = query.eq("id", meeting_id);
      } else if (title_search) {
        query = query.ilike("title", `%${escapeLike(title_search)}%`);
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

      // Batch fetch all extractions for found meetings (avoids N+1)
      const meetingIds = meetings.map((m: { id: string }) => m.id);
      const { data: allExtractions } = await supabase
        .from("extractions")
        .select(
          "meeting_id, type, content, confidence, transcript_ref, metadata, corrected_by, corrected_at",
        )
        .in("meeting_id", meetingIds)
        .order("type")
        .order("confidence", { ascending: false });

      // Group extractions by meeting_id
      const extractionsByMeeting: Record<string, McpExtractionRow[]> = {};
      for (const e of allExtractions || []) {
        if (!extractionsByMeeting[e.meeting_id]) extractionsByMeeting[e.meeting_id] = [];
        extractionsByMeeting[e.meeting_id].push(e);
      }

      const formatted = meetings.map((m: McpMeetingRow) => {
        const extractions = extractionsByMeeting[m.id] || [];

        const org = Array.isArray(m.organization) ? m.organization[0] : m.organization;
        const orgName = org?.name || m.unmatched_organization_name || "Onbekend";
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
            items.forEach((item: McpExtractionRow, i: number) => {
              const status = formatVerificatieStatus(item.confidence, item.corrected_by);
              const meta: string[] = [];
              if (item.metadata?.assignee) meta.push(`Eigenaar: ${item.metadata.assignee}`);
              if (item.metadata?.deadline) meta.push(`Deadline: ${item.metadata.deadline}`);
              if (item.metadata?.made_by) meta.push(`Door: ${item.metadata.made_by}`);
              if (item.metadata?.urgency) meta.push(`Urgentie: ${item.metadata.urgency}`);

              sections.push(`${i + 1}. ${item.content}`);
              if (status) sections.push(`   ${status}`);
              if (meta.length > 0) sections.push(`   ${meta.join(" | ")}`);
              if (item.transcript_ref) sections.push(`   Citaat: "${item.transcript_ref}"`);
            });
          }
        } else {
          sections.push("", "Nog geen extracties beschikbaar.");
        }

        sections.push("", `**Meeting ID:** ${m.id}`);
        return sections.join("\n");
      });

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
