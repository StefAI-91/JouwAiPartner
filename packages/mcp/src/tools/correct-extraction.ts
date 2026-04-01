import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@repo/database/supabase/admin";
import { trackMcpQuery } from "./usage-tracking";
import { escapeLike } from "./utils";

export function registerCorrectExtractionTools(server: McpServer) {
  server.tool(
    "correct_extraction",
    "Corrigeer een extractie (besluit, actiepunt, inzicht, behoefte). Overschrijf de content en/of metadata. De correctie wordt gelogd met wie het gecorrigeerd heeft en wanneer, en de embedding wordt opnieuw berekend.",
    {
      extraction_id: z.string().describe("UUID van de extractie die gecorrigeerd moet worden"),
      content: z
        .string().max(2000)
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

      const { data: existing, error: fetchError } = await supabase
        .from("extractions")
        .select("id, content, metadata, type, meeting_id")
        .eq("id", extraction_id)
        .single();

      if (fetchError || !existing) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Extractie ${extraction_id} niet gevonden.`,
            },
          ],
        };
      }

      let correctedByUserId: string | null = null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .ilike("full_name", `%${escapeLike(corrected_by_name)}%`)
        .limit(1);

      if (profile && profile.length > 0) {
        correctedByUserId = profile[0].id;
      }

      const updatePayload: {
        corrected_by: string | null;
        corrected_at: string;
        embedding_stale: boolean;
        content?: string;
        metadata?: Record<string, unknown>;
      } = {
        corrected_by: correctedByUserId,
        corrected_at: new Date().toISOString(),
        embedding_stale: true,
      };

      if (content) {
        updatePayload.content = content;
      }

      if (metadata) {
        const existingMeta =
          typeof existing.metadata === "object" && existing.metadata !== null
            ? existing.metadata
            : {};
        const mergedMeta = { ...existingMeta };
        if (metadata.assignee !== undefined)
          (mergedMeta as Record<string, unknown>).assignee = metadata.assignee;
        if (metadata.deadline !== undefined)
          (mergedMeta as Record<string, unknown>).deadline = metadata.deadline;
        if (metadata.made_by !== undefined)
          (mergedMeta as Record<string, unknown>).made_by = metadata.made_by;
        if (metadata.urgency !== undefined)
          (mergedMeta as Record<string, unknown>).urgency = metadata.urgency;
        updatePayload.metadata = mergedMeta;
      }

      const { error: updateError } = await supabase
        .from("extractions")
        .update(updatePayload)
        .eq("id", extraction_id);

      if (updateError) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Fout bij bijwerken: ${updateError.message}`,
            },
          ],
        };
      }

      const changes: string[] = [];
      if (content) changes.push(`Content bijgewerkt`);
      if (metadata) {
        const fields = Object.keys(metadata).filter(
          (k) => metadata[k as keyof typeof metadata] !== undefined,
        );
        changes.push(`Metadata bijgewerkt: ${fields.join(", ")}`);
      }

      const typeLabels: Record<string, string> = {
        decision: "Besluit",
        action_item: "Actiepunt",
        insight: "Inzicht",
        need: "Behoefte",
      };

      return {
        content: [
          {
            type: "text" as const,
            text: [
              `## Extractie gecorrigeerd`,
              `**Type:** ${typeLabels[existing.type] || existing.type}`,
              `**Gecorrigeerd door:** ${corrected_by_name}${correctedByUserId ? "" : " (profiel niet gevonden, corrected_by is NULL)"}`,
              `**Wijzigingen:** ${changes.join("; ")}`,
              `**Embedding:** wordt opnieuw berekend (embedding_stale=true)`,
              "",
              `Bij de volgende query wordt deze extractie getoond als "Geverifieerd (gecorrigeerd)".`,
            ].join("\n"),
          },
        ],
      };
    },
  );
}
