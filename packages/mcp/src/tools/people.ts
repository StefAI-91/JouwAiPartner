import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@repo/database/supabase/admin";

import { trackMcpQuery } from "./usage-tracking";
import { escapeLike } from "./utils";

export function registerPeopleTools(server: McpServer) {
  server.tool(
    "get_people",
    "Haal mensen op (teamleden, klanten, contactpersonen). Zoek op naam, team of rol. Gebruik om te achterhalen wie er in het team zit of om een persoon te vinden.",
    {
      search: z.string().optional().describe("Search by name (partial match)"),
      team: z.string().optional().describe("Filter by team (e.g. 'engineering', 'leadership')"),
      role: z.string().optional().describe("Filter by role (partial match)"),
    },
    async ({ search, team, role }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(
        supabase,
        "get_people",
        [search, team, role].filter(Boolean).join(", ") || "all",
      );

      let query = supabase.from("people").select("id, name, email, team, role").order("name");

      if (search) query = query.ilike("name", `%${escapeLike(search)}%`);
      if (team) query = query.eq("team", team);
      if (role) query = query.ilike("role", `%${escapeLike(role)}%`);

      const { data, error } = await query.limit(50);

      if (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      }

      if (!data || data.length === 0) {
        return {
          content: [{ type: "text" as const, text: "Geen mensen gevonden met deze filters." }],
        };
      }

      interface PersonItem {
        id: string;
        name: string;
        email: string | null;
        team: string | null;
        role: string | null;
      }

      const formatted = (data as PersonItem[]).map((p: PersonItem, i: number) => {
        const details = [
          p.role ? `Rol: ${p.role}` : null,
          p.team ? `Team: ${p.team}` : null,
          p.email ? `Email: ${p.email}` : null,
        ]
          .filter(Boolean)
          .join(" | ");
        return `${i + 1}. **${p.name}**\n   ${details || "Geen details"}`;
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `${data.length} mensen:\n\n${formatted.join("\n\n")}`,
          },
        ],
      };
    },
  );
}
