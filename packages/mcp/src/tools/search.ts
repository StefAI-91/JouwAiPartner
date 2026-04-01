import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@repo/database/supabase/admin";
import { embedText } from "@repo/ai/embeddings";
import { formatVerificatieStatus, lookupProfileNames, collectVerifiedByIds } from "./utils";
import { trackMcpQuery } from "./usage-tracking";

export function registerSearchTools(server: McpServer) {
  server.tool(
    "search_knowledge",
    "Semantisch zoeken over alle geverifieerde content in de kennisbasis (meetings, besluiten, actiepunten, inzichten, behoeften). Retourneert standaard alleen geverifieerde content. Gebruik include_drafts=true voor ongeverifieerde content (alleen intern). Resultaten bevatten bronvermelding, confidence en verificatie-status. Let op: voor het ophalen van meetings op basis van titel of organisatienaam, gebruik `list_meetings` met `title_search` of `organization` filter. Semantisch zoeken kan resultaten missen die wel vindbaar zijn via exacte filters.",
    {
      query: z.string().describe("The search query in natural language"),
      limit: z.number().optional().default(10).describe("Max results to return (default 10)"),
      include_drafts: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include unverified (draft) content. Only for internal review purposes."),
    },
    async ({ query, limit, include_drafts }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(supabase, "search_knowledge", query);
      const queryEmbedding = await embedText(query, "search_query");

      const { data: results, error } = await supabase.rpc("search_all_content", {
        query_embedding: queryEmbedding,
        query_text: query,
        match_threshold: 0.3,
        match_count: limit,
        verified_only: !include_drafts,
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

      interface SearchResult {
        id: string;
        source_type: string;
        content: string;
        title: string | null;
        date: string | null;
        similarity: number;
        confidence: number | null;
        corrected_by: string | null;
        transcript_ref: string | null;
        meeting_id: string | null;
        verification_status: string | null;
        verified_by: string | null;
        verified_at: string | null;
      }

      const typedResults = results as unknown as SearchResult[];
      const profileMap = await lookupProfileNames(supabase, collectVerifiedByIds(typedResults));

      const formatted = typedResults.map((r: SearchResult, i: number) => {
        const sourceLabel = sourceLabels[r.source_type] || r.source_type;
        const dateStr = r.date ? new Date(r.date).toLocaleDateString("nl-NL") : null;
        const status = formatVerificatieStatus(
          r.verification_status,
          r.verified_by ? profileMap[r.verified_by] || null : null,
          r.verified_at,
          r.confidence,
          r.corrected_by,
        );

        return [
          `### Result ${i + 1} — ${sourceLabel} (similarity: ${r.similarity.toFixed(3)})`,
          r.title ? `**Bron:** ${r.title}${dateStr ? ` (${dateStr})` : ""}` : null,
          `**Status:** ${status}`,
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
