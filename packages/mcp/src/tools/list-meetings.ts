import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@repo/database/supabase/admin";
import { trackMcpQuery } from "./usage-tracking";
import {
  escapeLike,
  resolveProjectIds,
  resolveOrganizationIds,
  resolveMeetingIdsByParticipant,
} from "./utils";
import { getSegmentCountsByMeetingIds } from "@repo/database/queries/meeting-project-summaries";

export function registerListMeetingsTools(server: McpServer) {
  server.tool(
    "list_meetings",
    "Zoek en filter geverifieerde meetings op titel, organisatie, project, datum, type, partij en deelnemer. Gebruik `participant` om meetings te vinden waar een specifiek persoon aan deelnam (bijv. 'Wouter'). Gebruik `title_search` om meetings te vinden op (deel van) de titel. Dit is betrouwbaarder dan semantisch zoeken wanneer je specifieke meetings op naam zoekt. Retourneert standaard alleen geverifieerde meetings. Gebruik include_drafts=true voor ongeverifieerde meetings (alleen intern). Geeft een compacte lijst met titel, datum, type en organisatie.",
    {
      title_search: z
        .string()
        .max(255)
        .optional()
        .describe("Filter op meeting titel (partial match, case-insensitive)"),
      participant: z
        .string()
        .max(255)
        .optional()
        .describe("Filter op deelnemer/persoon (partial match op naam, bijv. 'Wouter')"),
      organization: z
        .string()
        .max(255)
        .optional()
        .describe("Filter op organisatienaam (partial match)"),
      project: z.string().max(255).optional().describe("Filter op projectnaam (partial match)"),
      date_from: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}/)
        .optional()
        .describe("Vanaf datum (ISO format, bijv. 2026-01-01)"),
      date_to: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}/)
        .optional()
        .describe("Tot en met datum, inclusief (ISO format, bijv. 2026-03-31)"),
      meeting_type: z.string().max(100).optional().describe("Filter op meeting type"),
      party_type: z
        .enum(["client", "partner", "internal", "other"])
        .optional()
        .describe("Filter op partij type"),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .default(20)
        .describe("Max aantal resultaten (standaard 20, max 100)"),
      offset: z
        .number()
        .optional()
        .default(0)
        .describe("Aantal resultaten overslaan (voor pagination)"),
      include_drafts: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include unverified (draft) meetings. Only for internal review purposes."),
    },
    async ({
      title_search,
      participant,
      organization,
      project,
      date_from,
      date_to,
      meeting_type,
      party_type,
      limit,
      offset,
      include_drafts,
    }) => {
      const supabase = getAdminClient();

      const queryDesc = [
        title_search,
        participant,
        organization,
        project,
        date_from,
        date_to,
        meeting_type,
        party_type,
      ]
        .filter(Boolean)
        .join(", ");
      await trackMcpQuery(supabase, "list_meetings", queryDesc || "all");

      let query = supabase
        .from("meetings")
        .select(
          `id, title, date, meeting_type, party_type, relevance_score, verification_status, participants,
           organization:organization_id (id, name),
           unmatched_organization_name`,
        )
        .order("date", { ascending: false });

      if (!include_drafts) {
        query = query.eq("verification_status", "verified");
      }

      if (title_search) {
        query = query.ilike("title", `%${escapeLike(title_search)}%`);
      }

      if (participant) {
        const meetingIds = await resolveMeetingIdsByParticipant(supabase, participant);
        if (!meetingIds) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Geen meetings gevonden met deelnemer "${participant}".`,
              },
            ],
          };
        }
        query = query.in("id", meetingIds);
      }

      if (organization) {
        const orgIds = await resolveOrganizationIds(supabase, organization);
        if (!orgIds) {
          return {
            content: [
              { type: "text" as const, text: `Geen organisatie gevonden voor "${organization}".` },
            ],
          };
        }
        query = query.in("organization_id", orgIds);
      }

      if (project) {
        const projectIds = await resolveProjectIds(supabase, project);
        if (!projectIds) {
          return {
            content: [{ type: "text" as const, text: `Geen project gevonden voor "${project}".` }],
          };
        }
        const { data: meetingProjects } = await supabase
          .from("meeting_projects")
          .select("meeting_id")
          .in("project_id", projectIds);

        if (meetingProjects && meetingProjects.length > 0) {
          const meetingIds = meetingProjects.map((mp: { meeting_id: string }) => mp.meeting_id);
          query = query.in("id", meetingIds);
        } else {
          return {
            content: [
              { type: "text" as const, text: `Geen meetings gevonden voor project "${project}".` },
            ],
          };
        }
      }

      if (date_from) query = query.gte("date", date_from);
      if (date_to) {
        const endOfDay = date_to.includes("T") ? date_to : `${date_to}T23:59:59.999Z`;
        query = query.lte("date", endOfDay);
      }
      if (meeting_type) query = query.eq("meeting_type", meeting_type);
      if (party_type) query = query.eq("party_type", party_type);

      const { data: meetings, error } = await query.range(offset, offset + limit - 1);

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
              text: "Geen meetings gevonden met deze filters.",
            },
          ],
        };
      }

      interface MeetingListItem {
        id: string;
        title: string;
        date: string | null;
        meeting_type: string | null;
        party_type: "client" | "partner" | "internal" | "other" | null;
        relevance_score: number | null;
        participants: string[] | null;
        organization: { id: string; name: string } | null;
        unmatched_organization_name: string | null;
        verification_status: string | null;
      }

      const meetingIds = (meetings as unknown as MeetingListItem[]).map((m) => m.id);
      const segmentCounts = await getSegmentCountsByMeetingIds(meetingIds);

      const formatted = (meetings as unknown as MeetingListItem[]).map(
        (m: MeetingListItem, i: number) => {
          const dateStr = m.date ? new Date(m.date).toLocaleDateString("nl-NL") : "Onbekend";
          const orgName = m.organization?.name || m.unmatched_organization_name || "—";
          const relevance = m.relevance_score
            ? ` | Relevantie: ${m.relevance_score.toFixed(2)}`
            : "";
          const status =
            m.verification_status === "verified"
              ? ""
              : ` | Status: ${m.verification_status || "draft"}`;

          const participants = m.participants?.join(", ") || "—";
          const segCount = segmentCounts.get(m.id);
          const segInfo = segCount ? ` | Segments: ${segCount}` : "";

          return `${offset + i + 1}. **${m.title}**\n   ${dateStr} | ${m.meeting_type || "—"} | ${m.party_type || "—"} | ${orgName}${relevance}${status}${segInfo}\n   Deelnemers: ${participants}\n   ID: ${m.id}`;
        },
      );

      const paginationNote =
        meetings.length === limit
          ? `\n\n_Meer resultaten beschikbaar. Gebruik offset=${offset + limit} voor de volgende pagina._`
          : "";

      return {
        content: [
          {
            type: "text" as const,
            text: `${meetings.length} meetings gevonden:\n\n${formatted.join("\n\n")}${paginationNote}`,
          },
        ],
      };
    },
  );
}
