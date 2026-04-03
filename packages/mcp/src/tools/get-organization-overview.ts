import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@repo/database/supabase/admin";
import { trackMcpQuery } from "./usage-tracking";
import {
  escapeLike,
  formatVerificatieStatus,
  lookupProfileNames,
  collectVerifiedByIds,
} from "./utils";

export function registerOrganizationOverviewTools(server: McpServer) {
  server.tool(
    "get_organization_overview",
    "Haal een compleet overzicht op van een organisatie: basisgegevens, gekoppelde projecten, recente geverifieerde meetings, en extracties. Retourneert standaard alleen geverifieerde content. Gebruik include_drafts=true voor ongeverifieerde content (alleen intern).",
    {
      organization_name: z.string().max(255).describe("Naam (of deel van naam) van de organisatie"),
      include_drafts: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include unverified (draft) content. Only for internal review purposes."),
    },
    async ({ organization_name, include_drafts }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(supabase, "get_organization_overview", organization_name);

      const escaped = escapeLike(organization_name);
      const { data: orgs, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, aliases, type, contact_person, email, status")
        .or(`name.ilike.%${escaped}%,aliases.cs.{${organization_name}}`)
        .limit(1);

      if (orgError || !orgs || orgs.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Geen organisatie gevonden voor "${organization_name}".`,
            },
          ],
        };
      }

      const org = orgs[0];

      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, aliases, status")
        .eq("organization_id", org.id)
        .order("name");

      let meetingsQuery = supabase
        .from("meetings")
        .select(
          "id, title, date, meeting_type, party_type, relevance_score, summary, verification_status, verified_by, verified_at",
        )
        .eq("organization_id", org.id)
        .order("date", { ascending: false })
        .limit(20);

      if (!include_drafts) {
        meetingsQuery = meetingsQuery.eq("verification_status", "verified");
      }

      const { data: meetings, error: meetingsError } = await meetingsQuery;
      if (meetingsError) {
        return {
          content: [{ type: "text" as const, text: `Error bij ophalen meetings: ${meetingsError.message}` }],
        };
      }

      let extractionsQuery = supabase
        .from("extractions")
        .select(
          "type, content, confidence, metadata, transcript_ref, corrected_by, meeting_id, verification_status, verified_by, verified_at",
        )
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!include_drafts) {
        extractionsQuery = extractionsQuery.eq("verification_status", "verified");
      }

      const { data: extractions, error: extractionsError } = await extractionsQuery;
      if (extractionsError) {
        return {
          content: [{ type: "text" as const, text: `Error bij ophalen extracties: ${extractionsError.message}` }],
        };
      }

      interface OverviewProject {
        id: string;
        name: string;
        aliases: string[];
        status: string;
      }

      interface OverviewMeeting {
        id: string;
        title: string;
        date: string | null;
        meeting_type: string | null;
        party_type: "client" | "partner" | "internal" | "other" | null;
        relevance_score: number | null;
        summary: string | null;
        verification_status: string | null;
        verified_by: string | null;
        verified_at: string | null;
      }

      interface OverviewExtraction {
        type: string;
        content: string;
        confidence: number | null;
        metadata: {
          assignee?: string;
          deadline?: string;
          made_by?: string;
          urgency?: string;
        } | null;
        transcript_ref: string | null;
        corrected_by: string | null;
        meeting_id: string;
        verification_status: string | null;
        verified_by: string | null;
        verified_at: string | null;
      }

      const typedMeetings = (meetings || []) as unknown as OverviewMeeting[];
      const typedExtractions = (extractions || []) as unknown as OverviewExtraction[];

      const profileMap = await lookupProfileNames(
        supabase,
        collectVerifiedByIds([...typedMeetings, ...typedExtractions]),
      );

      const sections: string[] = [];

      const aliases = org.aliases?.length > 0 ? ` (${org.aliases.join(", ")})` : "";
      sections.push(`# ${org.name}${aliases}`);
      sections.push(`**Type:** ${org.type} | **Status:** ${org.status}`);
      if (org.contact_person) {
        sections.push(`**Contact:** ${org.contact_person}${org.email ? ` <${org.email}>` : ""}`);
      }

      sections.push("", "## Projecten");
      if (projects && projects.length > 0) {
        (projects as unknown as OverviewProject[]).forEach((p: OverviewProject, i: number) => {
          const pAliases = p.aliases?.length > 0 ? ` (${p.aliases.join(", ")})` : "";
          sections.push(`${i + 1}. **${p.name}**${pAliases} — ${p.status}`);
        });
      } else {
        sections.push("Geen projecten gekoppeld.");
      }

      sections.push("", "## Recente meetings");
      if (typedMeetings.length > 0) {
        typedMeetings.forEach((m: OverviewMeeting, i: number) => {
          const dateStr = m.date ? new Date(m.date).toLocaleDateString("nl-NL") : "Onbekend";
          const status = formatVerificatieStatus(
            m.verification_status,
            m.verified_by ? profileMap[m.verified_by] || null : null,
            m.verified_at,
            null,
            null,
          );
          sections.push(
            `${i + 1}. **${m.title}** — ${dateStr} (${m.meeting_type || "onbekend type"}) | ${status}`,
          );
          if (m.summary) {
            const short = m.summary.length > 150 ? m.summary.slice(0, 150) + "..." : m.summary;
            sections.push(`   ${short}`);
          }
          sections.push(`   Meeting ID: ${m.id}`);
        });
      } else {
        sections.push("Geen meetings gevonden.");
      }

      sections.push("", "## Extracties");
      if (typedExtractions.length > 0) {
        const grouped: Record<string, OverviewExtraction[]> = {};
        for (const e of typedExtractions) {
          if (!grouped[e.type]) grouped[e.type] = [];
          grouped[e.type].push(e);
        }

        const typeLabels: Record<string, string> = {
          decision: "Besluiten",
          action_item: "Actiepunten",
          insight: "Inzichten",
          need: "Behoeften",
        };

        for (const [type, items] of Object.entries(grouped)) {
          const label = typeLabels[type] || type;
          sections.push("", `### ${label} (${items.length})`);
          items.forEach((item: OverviewExtraction, i: number) => {
            const status = formatVerificatieStatus(
              item.verification_status,
              item.verified_by ? profileMap[item.verified_by] || null : null,
              item.verified_at,
              item.confidence,
              item.corrected_by,
            );
            const meta: string[] = [];
            if (item.metadata?.assignee) meta.push(`Eigenaar: ${item.metadata.assignee}`);
            if (item.metadata?.deadline) meta.push(`Deadline: ${item.metadata.deadline}`);
            if (item.metadata?.made_by) meta.push(`Door: ${item.metadata.made_by}`);
            if (item.metadata?.urgency) meta.push(`Urgentie: ${item.metadata.urgency}`);

            sections.push(`${i + 1}. ${item.content}`);
            sections.push(`   ${status}`);
            if (meta.length > 0) sections.push(`   ${meta.join(" | ")}`);
            if (item.transcript_ref) sections.push(`   Citaat: "${item.transcript_ref}"`);
          });
        }
      } else {
        sections.push("Nog geen extracties beschikbaar.");
      }

      sections.push(
        "",
        `**Totaal:** ${projects?.length || 0} projecten, ${typedMeetings.length} meetings, ${typedExtractions.length} extracties`,
      );

      return {
        content: [{ type: "text" as const, text: sections.join("\n") }],
      };
    },
  );
}
