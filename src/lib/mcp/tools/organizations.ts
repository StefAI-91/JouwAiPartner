import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import type { McpOrganizationRow } from "@/lib/types/mcp";

import { trackMcpQuery } from "./usage-tracking";
import { escapeLike } from "./utils";

export function registerOrganizationTools(server: McpServer) {
  server.tool(
    "get_organizations",
    "Haal een lijst van organisaties op (klanten, partners, leveranciers). Zoek op naam of filter op type/status. Voor een compleet overzicht van één organisatie met al haar meetings, projecten en extracties, gebruik get_organization_overview.",
    {
      search: z.string().optional().describe("Search by name or alias (partial match)"),
      type: z
        .enum(["client", "partner", "supplier", "other"])
        .optional()
        .describe("Filter by type"),
      status: z.enum(["prospect", "active", "inactive"]).optional().describe("Filter by status"),
    },
    async ({ search, type, status }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(
        supabase,
        "get_organizations",
        [search, type, status].filter(Boolean).join(", ") || "all",
      );

      let query = supabase
        .from("organizations")
        .select("id, name, aliases, type, contact_person, email, status")
        .order("name");

      if (type) query = query.eq("type", type);
      if (status) query = query.eq("status", status);
      if (search) query = query.ilike("name", `%${escapeLike(search)}%`);

      const { data, error } = await query.limit(50);

      if (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      }

      if (!data || data.length === 0) {
        return {
          content: [
            { type: "text" as const, text: "Geen organisaties gevonden met deze filters." },
          ],
        };
      }

      const formatted = data.map((org: McpOrganizationRow, i: number) => {
        const aliases = org.aliases && org.aliases.length > 0 ? ` (${org.aliases.join(", ")})` : "";
        const contact = org.contact_person
          ? `\n   Contact: ${org.contact_person}${org.email ? ` <${org.email}>` : ""}`
          : "";
        return `${i + 1}. **${org.name}**${aliases}\n   Type: ${org.type} | Status: ${org.status}${contact}`;
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `${data.length} organisaties:\n\n${formatted.join("\n\n")}`,
          },
        ],
      };
    },
  );
}
