import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import { embedText } from "@/lib/embeddings";

export function registerSearchTools(server: McpServer) {
  server.tool(
    "search_knowledge",
    "Semantisch zoeken over alle content in de kennisbasis. Gebruik voor vragen over bedrijfskennis, besluiten, projecten, mensen of meetings.",
    {
      query: z.string().describe("The search query in natural language"),
      limit: z.number().optional().default(10).describe("Max results to return (default 10)"),
    },
    async ({ query, limit }) => {
      const supabase = getAdminClient();
      const queryEmbedding = await embedText(query);

      const { data: results, error } = await supabase.rpc("search_all_content", {
        query_embedding: queryEmbedding,
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = results.map((r: any, i: number) => {
        return [
          `### Result ${i + 1} (${r.source_table}, similarity: ${r.similarity.toFixed(3)})`,
          r.title ? `**Title:** ${r.title}` : null,
          `**Content:** ${r.content.slice(0, 500)}${r.content.length > 500 ? "..." : ""}`,
          `**Source ID:** ${r.id}`,
        ]
          .filter(Boolean)
          .join("\n");
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${results.length} results:\n\n${formatted.join("\n\n---\n\n")}`,
          },
        ],
      };
    },
  );
}
