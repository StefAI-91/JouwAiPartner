import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import type { McpListMeetingRow } from "@/lib/types/mcp";
import { trackMcpQuery } from "./usage-tracking";
import { escapeLike } from "./utils";

export function registerListMeetingsTools(server: McpServer) {
  server.tool(
    "list_meetings",
    "Zoek en filter meetings op organisatie, project, datum, type en partij. Geeft een compacte lijst met titel, datum, type en organisatie. Gebruik voor vragen als 'Wanneer spraken we klant X laatst?' of 'Welke meetings hadden we deze maand?'.",
    {
      organization: z.string().optional().describe("Filter op organisatienaam (partial match)"),
      project: z.string().optional().describe("Filter op projectnaam (partial match)"),
      date_from: z.string().optional().describe("Vanaf datum (ISO format, bijv. 2026-01-01)"),
      date_to: z.string().optional().describe("Tot datum (ISO format, bijv. 2026-03-31)"),
      meeting_type: z.string().optional().describe("Filter op meeting type"),
      party_type: z
        .enum(["client", "partner", "internal", "other"])
        .optional()
        .describe("Filter op partij type"),
      limit: z.number().optional().default(20).describe("Max aantal resultaten (standaard 20)"),
      offset: z
        .number()
        .optional()
        .default(0)
        .describe("Aantal resultaten overslaan (voor pagination)"),
    },
    async ({
      organization,
      project,
      date_from,
      date_to,
      meeting_type,
      party_type,
      limit,
      offset,
    }) => {
      const supabase = getAdminClient();

      const queryDesc = [organization, project, date_from, date_to, meeting_type, party_type]
        .filter(Boolean)
        .join(", ");
      await trackMcpQuery(supabase, "list_meetings", queryDesc || "all");

      let query = supabase
        .from("meetings")
        .select(
          `id, title, date, meeting_type, party_type, relevance_score,
           organization:organization_id (id, name),
           unmatched_organization_name`,
        )
        .order("date", { ascending: false });

      // Organization filter: look up org ID first
      if (organization) {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id")
          .ilike("name", `%${escapeLike(organization)}%`);

        if (orgs && orgs.length > 0) {
          const orgIds = orgs.map((o: { id: string }) => o.id);
          query = query.in("organization_id", orgIds);
        } else {
          return {
            content: [
              {
                type: "text" as const,
                text: `Geen organisatie gevonden voor "${organization}".`,
              },
            ],
          };
        }
      }

      // Project filter: look up meetings via meeting_projects join
      if (project) {
        const { data: projects } = await supabase
          .from("projects")
          .select("id")
          .ilike("name", `%${escapeLike(project)}%`);

        if (projects && projects.length > 0) {
          const projectIds = projects.map((p: { id: string }) => p.id);
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
                {
                  type: "text" as const,
                  text: `Geen meetings gevonden voor project "${project}".`,
                },
              ],
            };
          }
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

      if (date_from) query = query.gte("date", date_from);
      if (date_to) query = query.lte("date", date_to);
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

      const formatted = meetings.map((m: McpListMeetingRow, i: number) => {
        const dateStr = m.date ? new Date(m.date).toLocaleDateString("nl-NL") : "Onbekend";
        const orgName = m.organization?.name || m.unmatched_organization_name || "—";
        const relevance = m.relevance_score ? ` | Relevantie: ${m.relevance_score.toFixed(2)}` : "";

        return `${offset + i + 1}. **${m.title}**\n   ${dateStr} | ${m.meeting_type || "—"} | ${m.party_type || "—"} | ${orgName}${relevance}\n   ID: ${m.id}`;
      });

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
