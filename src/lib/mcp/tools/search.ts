import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import { embedText } from "@/lib/embeddings";
import { formatVerificatieStatus } from "./utils";

export function registerSearchTools(server: McpServer) {
  server.tool(
    "search_knowledge",
    "Semantisch zoeken over alle content in de kennisbasis (meetings, besluiten, actiepunten, inzichten, behoeften). Retourneert resultaten met bronvermelding, confidence en verificatie-status.",
    {
      query: z.string().describe("The search query in natural language"),
      limit: z.number().optional().default(10).describe("Max results to return (default 10)"),
    },
    async ({ query, limit }) => {
      const supabase = getAdminClient();
      const queryEmbedding = await embedText(query, "search_query");

      const { data: results, error } = await supabase.rpc("search_all_content", {
        query_embedding: queryEmbedding,
        query_text: query,
        match_threshold: 0.3,
        match_count: limit,
      });

      if (error) {
        return {
          content: [{ type: "text" as const, text: `Search error: ${error.message}` }],
        };
      }

      if (!results || results.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Geen relevante resultaten gevonden in de kennisbasis.",
            },
          ],
        };
      }

      const sourceLabels: Record<string, string> = {
        meeting: "Meeting",
        decision: "Besluit",
        action_item: "Actiepunt",
        insight: "Inzicht",
        need: "Behoefte",
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = results.map((r: any, i: number) => {
        const sourceLabel = sourceLabels[r.source_type] || r.source_type;
        const dateStr = r.date ? new Date(r.date).toLocaleDateString("nl-NL") : null;
        const status = formatVerificatieStatus(r.confidence, r.corrected_by);

        return [
          `### Result ${i + 1} — ${sourceLabel} (similarity: ${r.similarity.toFixed(3)})`,
          r.title ? `**Bron:** ${r.title}${dateStr ? ` (${dateStr})` : ""}` : null,
          status ? `**Status:** ${status}` : null,
          `**Content:** ${r.content.slice(0, 500)}${r.content.length > 500 ? "..." : ""}`,
          r.transcript_ref ? `**Citaat:** "${r.transcript_ref}"` : null,
          `**ID:** ${r.id}${r.meeting_id && r.meeting_id !== r.id ? ` | Meeting: ${r.meeting_id}` : ""}`,
        ]
          .filter(Boolean)
          .join("\n");
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `${results.length} resultaten gevonden:\n\n${formatted.join("\n\n---\n\n")}`,
          },
        ],
      };
    },
  );
}
