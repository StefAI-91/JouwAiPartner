import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";

export function registerProjectTools(server: McpServer) {
  server.tool(
    "get_projects",
    "Haal projecten op, optioneel gefilterd op naam, organisatie of status.",
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

      let query = supabase
        .from("projects")
        .select(
          `id, name, aliases, status,
           organization:organization_id (name)`,
        )
        .order("name");

      if (status) query = query.eq("status", status);
      if (search) query = query.ilike("name", `%${search}%`);

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

      let filtered = data;
      if (organization) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filtered = data.filter((p: any) =>
          p.organization?.name?.toLowerCase().includes(organization.toLowerCase()),
        );
      }

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
