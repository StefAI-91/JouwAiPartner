import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAdminClient } from "@/lib/supabase/admin";

export function registerPendingTools(server: McpServer) {
  server.tool(
    "get_pending_matches",
    "Bekijk ongematchte entiteiten die wachten op koppeling aan een project. Gebruik dit om te zien welke namen niet automatisch gekoppeld konden worden.",
    {},
    async () => {
      const supabase = getAdminClient();

      const { data: pendingMatches, error } = await supabase
        .from("pending_matches")
        .select(
          `
          id, content_id, content_table, extracted_name,
          suggested_match_id, similarity_score, status, created_at
        `,
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      }

      if (!pendingMatches || pendingMatches.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Geen ongematchte items. Alle entiteiten zijn gekoppeld.",
            },
          ],
        };
      }

      const grouped = new Map<string, typeof pendingMatches>();
      for (const match of pendingMatches) {
        const existing = grouped.get(match.extracted_name) || [];
        existing.push(match);
        grouped.set(match.extracted_name, existing);
      }

      const lines: string[] = [];
      let index = 1;

      for (const [name, matches] of grouped) {
        const count = matches.length;
        const tables = [...new Set(matches.map((m) => m.content_table))].join(", ");
        const dateStr = new Date(matches[0].created_at).toLocaleDateString("nl-NL");

        let line = `${index}. **"${name}"** — ${count}x gevonden in: ${tables} (sinds: ${dateStr})`;

        const withSuggestion = matches.find((m) => m.suggested_match_id);
        if (withSuggestion) {
          const { data: suggestedProject } = await supabase
            .from("projects")
            .select("name")
            .eq("id", withSuggestion.suggested_match_id)
            .single();

          if (suggestedProject) {
            line += `\n   Mogelijke match: "${suggestedProject.name}" (similarity: ${withSuggestion.similarity_score?.toFixed(2) || "N/A"})`;
          }
        }

        lines.push(line);
        index++;
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `${pendingMatches.length} ongematchte items:\n\n${lines.join("\n\n")}`,
          },
        ],
      };
    },
  );
}
