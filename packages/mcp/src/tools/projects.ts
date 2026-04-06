import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@repo/database/supabase/admin";

import { trackMcpQuery } from "./usage-tracking";
import { escapeLike } from "./utils";
import { getSegmentCountsByProjectIds } from "@repo/database/queries/meeting-project-summaries";

export function registerProjectTools(server: McpServer) {
  server.tool(
    "get_projects",
    "Haal projecten op, optioneel gefilterd op naam, organisatie of status. Toont projectnaam, aliassen, organisatie en status.",
    {
      search: z
        .string()
        .max(255)
        .optional()
        .describe("Search by project name or alias (partial match)"),
      organization: z
        .string()
        .max(255)
        .optional()
        .describe("Filter by organization name (partial match)"),
      status: z
        .enum(["lead", "active", "paused", "completed", "cancelled"])
        .optional()
        .describe("Filter by status"),
    },
    async ({ search, organization, status }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(
        supabase,
        "get_projects",
        [search, organization, status].filter(Boolean).join(", ") || "all",
      );

      let query = supabase
        .from("projects")
        .select(
          `id, name, aliases, status,
           organization:organization_id (name)`,
        )
        .order("name");

      if (status) query = query.eq("status", status);
      if (search) {
        const escaped = escapeLike(search);
        query = query.or(`name.ilike.%${escaped}%,aliases.cs.{${search}}`);
      }

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

      const { data, error } = await query.limit(50);

      if (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      }

      if (!data || data.length === 0) {
        return {
          content: [{ type: "text" as const, text: "Geen projecten gevonden met deze filters." }],
        };
      }

      const filtered = data;

      interface ProjectItem {
        id: string;
        name: string;
        aliases: string[];
        status: string;
        organization: { name: string } | null;
      }

      const projectIds = (filtered as unknown as ProjectItem[]).map((p) => p.id);
      const segmentCounts = await getSegmentCountsByProjectIds(projectIds);

      const formatted = (filtered as unknown as ProjectItem[]).map((p: ProjectItem, i: number) => {
        const aliases = p.aliases?.length > 0 ? ` (${p.aliases.join(", ")})` : "";
        const orgName = p.organization?.name || "geen organisatie";
        const segCount = segmentCounts.get(p.id) ?? 0;
        const segInfo = segCount > 0 ? ` | Segments: ${segCount} meetings with segments` : "";
        return `${i + 1}. **${p.name}**${aliases}\n   Organisatie: ${orgName} | Status: ${p.status}${segInfo}`;
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `${filtered.length} projecten:\n\n${formatted.join("\n\n")}`,
          },
        ],
      };
    },
  );
}
