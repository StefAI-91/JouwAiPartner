import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@repo/database/supabase/admin";
import {
  getExtractionForCorrection,
  correctExtraction,
} from "@repo/database/mutations/extractions";
import { findProfileIdByName } from "@repo/database/queries/people";
import { trackMcpQuery } from "./usage-tracking";

const TYPE_LABELS: Record<string, string> = {
  decision: "Besluit",
  action_item: "Actiepunt",
  insight: "Inzicht",
  need: "Behoefte",
};

/**
 * Merge new metadata fields into existing metadata.
 */
function mergeMetadata(
  existing: Record<string, unknown> | null,
  updates: { assignee?: string; deadline?: string; made_by?: string; urgency?: string },
): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    ...(typeof existing === "object" && existing !== null ? existing : {}),
  };

  if (updates.assignee !== undefined) merged.assignee = updates.assignee;
  if (updates.deadline !== undefined) merged.deadline = updates.deadline;
  if (updates.made_by !== undefined) merged.made_by = updates.made_by;
  if (updates.urgency !== undefined) merged.urgency = updates.urgency;

  return merged;
}

export function registerCorrectExtractionTools(server: McpServer) {
  server.tool(
    "correct_extraction",
    "Corrigeer een extractie (besluit, actiepunt, inzicht, behoefte). Overschrijf de content en/of metadata. De correctie wordt gelogd met wie het gecorrigeerd heeft en wanneer, en de embedding wordt opnieuw berekend.",
    {
      extraction_id: z
        .string()
        .uuid()
        .describe("UUID van de extractie die gecorrigeerd moet worden"),
      content: z
        .string()
        .max(2000)
        .optional()
        .describe("Nieuwe content tekst (laat leeg om niet te wijzigen)"),
      metadata: z
        .object({
          assignee: z.string().optional(),
          deadline: z.string().optional(),
          made_by: z.string().optional(),
          urgency: z.string().optional(),
        })
        .optional()
        .describe(
          "Metadata velden om te overschrijven (alleen meegegeven velden worden gewijzigd)",
        ),
      corrected_by_name: z.string().max(255).describe("Naam van de persoon die de correctie maakt"),
    },
    async ({ extraction_id, content, metadata, corrected_by_name }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(
        supabase,
        "correct_extraction",
        `${extraction_id}: ${content?.slice(0, 50) || "metadata only"}`,
      );

      // Fetch existing extraction
      const existing = await getExtractionForCorrection(extraction_id);
      if (!existing) {
        return {
          content: [{ type: "text" as const, text: `Extractie ${extraction_id} niet gevonden.` }],
        };
      }

      // Resolve corrector profile
      const correctedByUserId = await findProfileIdByName(corrected_by_name);

      // Build update payload
      const updates: {
        content?: string;
        metadata?: Record<string, unknown>;
        corrected_by: string | null;
      } = { corrected_by: correctedByUserId };

      if (content) updates.content = content;
      if (metadata) updates.metadata = mergeMetadata(existing.metadata, metadata);

      // Execute correction
      const result = await correctExtraction(extraction_id, updates);
      if ("error" in result) {
        return {
          content: [{ type: "text" as const, text: `Fout bij bijwerken: ${result.error}` }],
        };
      }

      // Build response
      const changes: string[] = [];
      if (content) changes.push("Content bijgewerkt");
      if (metadata) {
        const fields = Object.keys(metadata).filter(
          (k) => metadata[k as keyof typeof metadata] !== undefined,
        );
        changes.push(`Metadata bijgewerkt: ${fields.join(", ")}`);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: [
              "## Extractie gecorrigeerd",
              `**Type:** ${TYPE_LABELS[existing.type] || existing.type}`,
              `**Gecorrigeerd door:** ${corrected_by_name}${correctedByUserId ? "" : " (profiel niet gevonden, corrected_by is NULL)"}`,
              `**Wijzigingen:** ${changes.join("; ")}`,
              "**Embedding:** wordt opnieuw berekend (embedding_stale=true)",
              "",
              'Bij de volgende query wordt deze extractie getoond als "Geverifieerd (gecorrigeerd)".',
            ].join("\n"),
          },
        ],
      };
    },
  );
}
