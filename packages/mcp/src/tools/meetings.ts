import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@repo/database/supabase/admin";
import {
  escapeLike,
  formatVerificatieStatus,
  lookupProfileNames,
  collectVerifiedByIds,
} from "./utils";
import { trackMcpQuery } from "./usage-tracking";
import { getSegmentsByMeetingIds } from "@repo/database/queries/meetings/project-summaries";

export function registerMeetingTools(server: McpServer) {
  server.tool(
    "get_meeting_summary",
    "Haal de volledige samenvatting op voor een specifieke meeting: metadata, rijke samenvatting (met besluiten, behoeften, signalen als narratief), en actiepunten. Retourneert standaard alleen geverifieerde meetings. Gebruik include_drafts=true voor ongeverifieerde content (alleen intern).",
    {
      meeting_id: z
        .string()
        .uuid()
        .optional()
        .describe("UUID of the meeting (from search results or list_meetings)"),
      title_search: z
        .string()
        .max(255)
        .optional()
        .describe("Search meetings by title (partial match)"),
      include_drafts: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include unverified (draft) content. Only for internal review purposes."),
    },
    async ({ meeting_id, title_search, include_drafts }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(supabase, "get_meeting_summary", meeting_id || title_search || "");

      let query = supabase.from("meetings").select(
        `id, title, date, participants, summary, meeting_type, party_type,
           relevance_score, verification_status, verified_by, verified_at,
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

      if (!include_drafts) {
        query = query.eq("verification_status", "verified");
      }

      const { data: meetings, error } = await query.limit(5);

      if (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      }

      if (!meetings || meetings.length === 0) {
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

      const meetingIds = meetings.map((m: { id: string }) => m.id);
      let extractionQuery = supabase
        .from("extractions")
        .select(
          "meeting_id, type, content, confidence, transcript_ref, metadata, corrected_by, corrected_at, verification_status, verified_by, verified_at",
        )
        .in("meeting_id", meetingIds)
        .order("type")
        .order("confidence", { ascending: false });

      if (!include_drafts) {
        extractionQuery = extractionQuery.eq("verification_status", "verified");
      }

      const { data: allExtractions } = await extractionQuery;

      interface ExtractionItem {
        meeting_id: string;
        type: string;
        content: string;
        confidence: number | null;
        transcript_ref: string | null;
        metadata: {
          assignee?: string;
          deadline?: string;
          made_by?: string;
          urgency?: string;
        } | null;
        corrected_by: string | null;
        corrected_at: string | null;
        verification_status: string | null;
        verified_by: string | null;
        verified_at: string | null;
      }

      const extractionsByMeeting: Record<string, ExtractionItem[]> = {};
      for (const e of (allExtractions || []) as unknown as ExtractionItem[]) {
        if (!extractionsByMeeting[e.meeting_id]) extractionsByMeeting[e.meeting_id] = [];
        extractionsByMeeting[e.meeting_id].push(e);
      }

      // Collect all verified_by UUIDs from meetings and extractions
      interface MeetingSummaryItem {
        id: string;
        title: string;
        date: string | null;
        participants: string[] | null;
        summary: string | null;
        meeting_type: string | null;
        party_type: "client" | "partner" | "internal" | "other" | null;
        relevance_score: number | null;
        organization: { name: string } | null;
        unmatched_organization_name: string | null;
        verification_status: string | null;
        verified_by: string | null;
        verified_at: string | null;
      }

      const typedMeetings = meetings as unknown as MeetingSummaryItem[];
      const allItems = [...typedMeetings, ...Object.values(extractionsByMeeting).flat()];
      const profileMap = await lookupProfileNames(supabase, collectVerifiedByIds(allItems));

      const formatted = typedMeetings.map((m: MeetingSummaryItem) => {
        const extractions = extractionsByMeeting[m.id] || [];

        const orgName = m.organization?.name || m.unmatched_organization_name || "Onbekend";
        const dateStr = m.date ? new Date(m.date).toLocaleDateString("nl-NL") : "Onbekend";
        const meetingStatus = formatVerificatieStatus(
          m.verification_status,
          m.verified_by ? profileMap[m.verified_by] || null : null,
          m.verified_at,
          null,
          null,
        );

        const sections: string[] = [
          `## ${m.title}`,
          `**Datum:** ${dateStr}`,
          `**Deelnemers:** ${m.participants?.join(", ") || "Onbekend"}`,
          `**Type:** ${m.meeting_type || "Niet geclassificeerd"} | **Partij:** ${m.party_type || "Onbekend"}`,
          `**Organisatie:** ${orgName}`,
          `**Relevantie:** ${m.relevance_score?.toFixed(2) || "N/A"}`,
          `**Status:** ${meetingStatus}`,
          "",
          `### Samenvatting`,
          m.summary || "Geen samenvatting beschikbaar.",
        ];

        const actionItems = extractions.filter((e: ExtractionItem) => e.type === "action_item");
        if (actionItems.length > 0) {
          sections.push("", `### Actiepunten`);
          actionItems.forEach((item: ExtractionItem, i: number) => {
            const status = formatVerificatieStatus(
              item.verification_status,
              item.verified_by ? profileMap[item.verified_by] || null : null,
              item.verified_at,
              item.confidence,
              item.corrected_by,
            );
            const meta: string[] = [];
            if (item.metadata?.assignee) meta.push(`Eigenaar: ${item.metadata.assignee}`);
            if (item.metadata?.deadline) meta.push(`Deadline: ${item.metadata.deadline}`);

            sections.push(`${i + 1}. ${item.content}`);
            sections.push(`   ${status}`);
            if (meta.length > 0) sections.push(`   ${meta.join(" | ")}`);
            if (item.transcript_ref) sections.push(`   Citaat: "${item.transcript_ref}"`);
          });
        }

        sections.push("", `**Meeting ID:** ${m.id}`);
        return sections.join("\n");
      });

      // Batch fetch segments for all meetings (single query instead of N+1)
      const segmentsByMeeting = await getSegmentsByMeetingIds(meetingIds, supabase);
      for (let i = 0; i < typedMeetings.length; i++) {
        const segments = segmentsByMeeting.get(typedMeetings[i].id) ?? [];
        if (segments.length > 0) {
          const segLines = ["\n---\n### Project-segmenten"];
          for (const seg of segments) {
            const name = seg.project_name ?? seg.project_name_raw ?? "Algemeen";
            segLines.push(
              `**[${name}]** (${seg.kernpunten.length} kernpunten, ${seg.vervolgstappen.length} vervolgstappen)`,
            );
            for (const k of seg.kernpunten) segLines.push(`- ${k}`);
            if (seg.vervolgstappen.length > 0) {
              segLines.push("Vervolgstappen:");
              for (const v of seg.vervolgstappen) segLines.push(`- ${v}`);
            }
          }
          formatted[i] += "\n" + segLines.join("\n");
        }
      }

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
