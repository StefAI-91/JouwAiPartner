import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@repo/database/supabase/admin";
import {
  formatVerificatieStatus,
  lookupProfileNames,
  collectVerifiedByIds,
  resolveProjectIds,
} from "./utils";
import { trackMcpQuery } from "./usage-tracking";

export function registerDecisionTools(server: McpServer) {
  server.tool(
    "get_decisions",
    "Haal geverifieerde besluiten op uit meetings. Retourneert standaard alleen geverifieerde besluiten. Gebruik include_drafts=true voor ongeverifieerde content (alleen intern). Toont wie het besluit nam, bronvermelding en verificatie-status.",
    {
      project: z.string().max(255).optional().describe("Filter by project name"),
      date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional().describe("Filter by meeting date from (ISO format, e.g. 2026-03-01)"),
      date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional().describe("Filter by meeting date to, inclusive (ISO format, e.g. 2026-03-31)"),
      limit: z.number().optional().default(20).describe("Max results (default 20)"),
      include_drafts: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include unverified (draft) content. Only for internal review purposes."),
    },
    async ({ project, date_from, date_to, limit, include_drafts }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(
        supabase,
        "get_decisions",
        [project, date_from, date_to].filter(Boolean).join(", ") || "all",
      );

      const needsDateFilter = !!(date_from || date_to);
      const meetingJoin = needsDateFilter
        ? "meeting:meeting_id!inner (id, title, date, participants)"
        : "meeting:meeting_id (id, title, date, participants)";

      let query = supabase
        .from("extractions")
        .select(
          `
          id, content, confidence, transcript_ref, metadata, corrected_by, corrected_at, created_at,
          verification_status, verified_by, verified_at,
          ${meetingJoin},
          organization:organization_id (name),
          project:project_id (name)
        `,
        )
        .eq("type", "decision")
        .order("created_at", { ascending: false });

      if (!include_drafts) {
        query = query.eq("verification_status", "verified");
      }

      if (date_from) {
        query = query.gte("meeting.date", date_from);
      }
      if (date_to) {
        const endOfDay = date_to.includes("T") ? date_to : `${date_to}T23:59:59.999Z`;
        query = query.lte("meeting.date", endOfDay);
      }

      if (project) {
        const projectIds = await resolveProjectIds(supabase, project);
        if (!projectIds) {
          return {
            content: [
              { type: "text" as const, text: `Geen project gevonden voor "${project}".` },
            ],
          };
        }
        query = query.in("project_id", projectIds);
      }

      const { data: decisions, error } = await query.limit(limit);

      if (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      }

      if (!decisions || decisions.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Geen besluiten gevonden met deze filters.",
            },
          ],
        };
      }

      interface DecisionItem {
        id: string;
        content: string;
        confidence: number | null;
        transcript_ref: string | null;
        metadata: { made_by?: string } | null;
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

      const typedDecisions = decisions as unknown as DecisionItem[];
      const profileMap = await lookupProfileNames(supabase, collectVerifiedByIds(typedDecisions));

      const formatted = typedDecisions.map((d: DecisionItem, i: number) => {
        const meeting = d.meeting;
        const dateStr = meeting?.date
          ? new Date(meeting.date).toLocaleDateString("nl-NL")
          : "onbekende datum";
        const projectName = d.project?.name || d.organization?.name || "geen project";
        const status = formatVerificatieStatus(
          d.verification_status,
          d.verified_by ? profileMap[d.verified_by] || null : null,
          d.verified_at,
          d.confidence,
          d.corrected_by,
        );
        const madeBy = d.metadata?.made_by;

        return [
          `${i + 1}. **${d.content}**`,
          `   ${status}`,
          madeBy ? `   Besluit door: ${madeBy}` : null,
          `   Meeting: ${meeting?.title || "onbekend"} | Datum: ${dateStr}`,
          `   Project: ${projectName}`,
          d.transcript_ref ? `   Citaat: "${d.transcript_ref}"` : null,
        ]
          .filter(Boolean)
          .join("\n");
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `${typedDecisions.length} besluiten gevonden:\n\n${formatted.join("\n\n")}`,
          },
        ],
      };
    },
  );
}
