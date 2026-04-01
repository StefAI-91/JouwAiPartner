import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@repo/database/supabase/admin";
import {
  escapeLike,
  formatVerificatieStatus,
  lookupProfileNames,
  collectVerifiedByIds,
} from "./utils";
import { trackMcpQuery } from "./usage-tracking";

export function registerActionTools(server: McpServer) {
  server.tool(
    "get_action_items",
    "Haal geverifieerde actiepunten (taken, to-dos, afspraken) op uit meetings. Retourneert standaard alleen geverifieerde actiepunten. Gebruik include_drafts=true voor ongeverifieerde content (alleen intern). Toont eigenaar, deadline, bronvermelding en verificatie-status.",
    {
      person: z
        .string()
        .optional()
        .describe("Filter by person name (matches assignee in metadata or content)"),
      project: z.string().optional().describe("Filter by project name"),
      limit: z.number().optional().default(20).describe("Max results (default 20)"),
      include_drafts: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include unverified (draft) content. Only for internal review purposes."),
    },
    async ({ person, project, limit, include_drafts }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(
        supabase,
        "get_action_items",
        [person, project].filter(Boolean).join(", ") || "all",
      );

      let query = supabase
        .from("extractions")
        .select(
          `
          id, content, confidence, transcript_ref, metadata, corrected_by, corrected_at, created_at,
          verification_status, verified_by, verified_at,
          meeting:meeting_id (id, title, date, participants),
          organization:organization_id (name),
          project:project_id (name)
        `,
        )
        .eq("type", "action_item")
        .order("created_at", { ascending: false });

      if (!include_drafts) {
        query = query.eq("verification_status", "verified");
      }

      if (person) {
        const escaped = escapeLike(person);
        query = query.or(`content.ilike.%${escaped}%,metadata->>assignee.ilike.%${escaped}%`);
      }

      if (project) {
        const { data: projects } = await supabase
          .from("projects")
          .select("id")
          .ilike("name", `%${escapeLike(project)}%`);

        if (projects && projects.length > 0) {
          const projectIds = projects.map((p: { id: string }) => p.id);
          query = query.in("project_id", projectIds);
        } else {
          return {
            content: [
              {
                type: "text" as const,
                text: `Geen project gevonden voor "${project}".`,
              },
            ],
          };
        }
      }

      const { data: items, error } = await query.limit(limit);

      if (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      }

      if (!items || items.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Geen actiepunten gevonden met deze filters.",
            },
          ],
        };
      }

      interface ActionItem {
        id: string;
        content: string;
        confidence: number | null;
        transcript_ref: string | null;
        metadata: { assignee?: string; deadline?: string } | null;
        corrected_by: string | null;
        corrected_at: string | null;
        created_at: string;
        verification_status: string | null;
        verified_by: string | null;
        verified_at: string | null;
        meeting: {
          id: string;
          title: string;
          date: string | null;
          participants: string[] | null;
        } | null;
        organization: { name: string } | null;
        project: { name: string } | null;
      }

      const typedItems = items as unknown as ActionItem[];
      const profileMap = await lookupProfileNames(supabase, collectVerifiedByIds(typedItems));

      const formatted = typedItems.map((item: ActionItem, i: number) => {
        const meeting = item.meeting;
        const dateStr = meeting?.date
          ? new Date(meeting.date).toLocaleDateString("nl-NL")
          : "onbekende datum";
        const projectName = item.project?.name || item.organization?.name || "geen project";
        const status = formatVerificatieStatus(
          item.verification_status,
          item.verified_by ? profileMap[item.verified_by] || null : null,
          item.verified_at,
          item.confidence,
          item.corrected_by,
        );
        const assignee = item.metadata?.assignee;
        const deadline = item.metadata?.deadline;

        return [
          `${i + 1}. **${item.content}**`,
          `   ${status}`,
          assignee ? `   Eigenaar: ${assignee}` : null,
          deadline ? `   Deadline: ${deadline}` : null,
          `   Meeting: ${meeting?.title || "onbekend"} | Datum: ${dateStr}`,
          `   Project: ${projectName}`,
          item.transcript_ref ? `   Citaat: "${item.transcript_ref}"` : null,
        ]
          .filter(Boolean)
          .join("\n");
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `${typedItems.length} actiepunten gevonden:\n\n${formatted.join("\n\n")}`,
          },
        ],
      };
    },
  );
}
