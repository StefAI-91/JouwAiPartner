import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";

import { trackMcpQuery } from "./usage-tracking";
import { escapeLike } from "./utils";

export function registerProjectTools(server: McpServer) {
  server.tool(
    "get_projects",
    "Haal projecten op, optioneel gefilterd op naam, organisatie of status. Toont projectnaam, aliassen, organisatie en status.",
    {
      search: z.string().optional().describe("Search by project name or alias (partial match)"),
      organization: z.string().optional().describe("Filter by organization name (partial match)"),
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
      if (search) query = query.ilike("name", `%${escapeLike(search)}%`);

      // Database-side filtering for organization
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = filtered.map((p: any, i: number) => {
        const aliases = p.aliases?.length > 0 ? ` (${p.aliases.join(", ")})` : "";
        const orgName = p.organization?.name || "geen organisatie";
        return `${i + 1}. **${p.name}**${aliases}\n   Organisatie: ${orgName} | Status: ${p.status}`;
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
