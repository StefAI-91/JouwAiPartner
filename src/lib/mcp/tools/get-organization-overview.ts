import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import { trackMcpQuery } from "./usage-tracking";

export function registerOrganizationOverviewTools(server: McpServer) {
  server.tool(
    "get_organization_overview",
    "Haal een compleet overzicht op van een organisatie: basisgegevens, gekoppelde projecten, recente meetings, en extracties (besluiten, actiepunten, inzichten, behoeften). Ideaal voor vragen als 'Geef me alles over klant X'.",
    {
      organization_name: z.string().describe("Naam (of deel van naam) van de organisatie"),
    },
    async ({ organization_name }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(supabase, "get_organization_overview", organization_name);

      // 1. Find the organization
      const { data: orgs, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, aliases, type, contact_person, email, status")
        .ilike("name", `%${organization_name}%`)
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

      // 2. Get projects for this organization
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, aliases, status")
        .eq("organization_id", org.id)
        .order("name");

      // 3. Get meetings for this organization
      const { data: meetings } = await supabase
        .from("meetings")
        .select("id, title, date, meeting_type, party_type, relevance_score, summary")
        .eq("organization_id", org.id)
        .order("date", { ascending: false })
        .limit(20);

      // 4. Get extractions for this organization
      const { data: extractions } = await supabase
        .from("extractions")
        .select("type, content, confidence, metadata, transcript_ref, corrected_by, meeting_id")
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false })
        .limit(50);

      // Build output
      const sections: string[] = [];

      // Organization header
      const aliases = org.aliases?.length > 0 ? ` (${org.aliases.join(", ")})` : "";
      sections.push(`# ${org.name}${aliases}`);
      sections.push(`**Type:** ${org.type} | **Status:** ${org.status}`);
      if (org.contact_person) {
        sections.push(`**Contact:** ${org.contact_person}${org.email ? ` <${org.email}>` : ""}`);
      }

      // Projects
      sections.push("", "## Projecten");
      if (projects && projects.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        projects.forEach((p: any, i: number) => {
          const pAliases = p.aliases?.length > 0 ? ` (${p.aliases.join(", ")})` : "";
          sections.push(`${i + 1}. **${p.name}**${pAliases} — ${p.status}`);
        });
      } else {
        sections.push("Geen projecten gekoppeld.");
      }

      // Meetings
      sections.push("", "## Recente meetings");
      if (meetings && meetings.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meetings.forEach((m: any, i: number) => {
          const dateStr = m.date ? new Date(m.date).toLocaleDateString("nl-NL") : "Onbekend";
          sections.push(
            `${i + 1}. **${m.title}** — ${dateStr} (${m.meeting_type || "onbekend type"})`,
          );
          if (m.summary) {
            const short = m.summary.length > 150 ? m.summary.slice(0, 150) + "…" : m.summary;
            sections.push(`   ${short}`);
          }
          sections.push(`   Meeting ID: ${m.id}`);
        });
      } else {
        sections.push("Geen meetings gevonden.");
      }

      // Extractions grouped by type
      sections.push("", "## Extracties");
      if (extractions && extractions.length > 0) {
        const grouped: Record<string, typeof extractions> = {};
        for (const e of extractions) {
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items.forEach((item: any, i: number) => {
            const meta: string[] = [];
            if (item.metadata?.assignee) meta.push(`Eigenaar: ${item.metadata.assignee}`);
            if (item.metadata?.deadline) meta.push(`Deadline: ${item.metadata.deadline}`);
            if (item.metadata?.made_by) meta.push(`Door: ${item.metadata.made_by}`);
            if (item.metadata?.urgency) meta.push(`Urgentie: ${item.metadata.urgency}`);

            sections.push(`${i + 1}. ${item.content}`);
            if (meta.length > 0) sections.push(`   ${meta.join(" | ")}`);
            if (item.transcript_ref) sections.push(`   Citaat: "${item.transcript_ref}"`);
          });
        }
      } else {
        sections.push("Nog geen extracties beschikbaar.");
      }

      // People linked via meetings
      sections.push(
        "",
        `**Totaal:** ${projects?.length || 0} projecten, ${meetings?.length || 0} meetings, ${extractions?.length || 0} extracties`,
      );

      return {
        content: [{ type: "text" as const, text: sections.join("\n") }],
      };
    },
  );
}
