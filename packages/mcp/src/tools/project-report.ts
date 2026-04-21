import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@repo/database/supabase/admin";
import {
  getProjectActivityForReport,
  getProjectContextForReport,
  type ProjectActivityEvent,
} from "@repo/database/queries/reports";
import { trackMcpQuery } from "./usage-tracking";

/**
 * MCP-tools voor project-rapport context en activity. Samen met `issues.ts`
 * leveren ze de complete dataset voor een rapport: `get_project_context`
 * geeft meta + AI-samenvattingen, `get_project_activity` geeft de tijdlijn
 * van status-wijzigingen binnen een tijdvenster.
 */

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Vertaalt één event naar een leesbare regel voor de activity-timeline.
 * Prioriteert field-changes ("status: triage → in_progress") boven generieke
 * acties ("created", "classified").
 */
function formatEventLine(event: ProjectActivityEvent): string {
  const who = event.actor_name ?? "Systeem";
  const ref = `#${event.issue_number} "${event.issue_title}"`;

  if (event.field && event.old_value !== null && event.new_value !== null) {
    return `- **${who}** wijzigde ${ref} ${event.field}: ${event.old_value} → ${event.new_value}`;
  }

  if (event.action === "closed" || event.new_value === "done") {
    return `- **${who}** sloot ${ref}`;
  }
  if (event.action === "created") {
    return `- **${who}** maakte ${ref} aan`;
  }
  if (event.action === "assigned" && event.new_value) {
    return `- **${who}** wees ${ref} toe aan ${event.new_value}`;
  }
  if (event.action === "classified") {
    return `- ${ref} werd geclassificeerd door AI`;
  }

  return `- **${who}** · ${event.action} op ${ref}`;
}

/**
 * Groepeert events per kalenderdag (YYYY-MM-DD in Europe/Amsterdam). Events
 * binnen een dag komen in DB-volgorde (nieuwste eerst) zodat de lezer eerst
 * de laatste beweging van de dag ziet.
 */
function groupEventsByDay(events: ProjectActivityEvent[]): Map<string, ProjectActivityEvent[]> {
  const grouped = new Map<string, ProjectActivityEvent[]>();
  for (const event of events) {
    const day = new Date(event.created_at).toISOString().slice(0, 10);
    const bucket = grouped.get(day) ?? [];
    bucket.push(event);
    grouped.set(day, bucket);
  }
  return grouped;
}

// ────────────────────────────────────────────────────────────────────────────
// Tool registration
// ────────────────────────────────────────────────────────────────────────────

export function registerProjectReportTools(server: McpServer) {
  server.tool(
    "get_project_activity",
    "Haal activity-events op voor een project binnen een tijdvenster (default 14 dagen): status-wijzigingen, afrondingen, toewijzingen. Output is chronologisch gegroepeerd per dag (nieuwste dag bovenaan). Retourneert standaard 150 events per call — paginaar door met `offset` tot er geen NEXT_PAGE meer is.",
    {
      project_id: z.string().uuid().describe("UUID van het project"),
      days_back: z
        .number()
        .int()
        .min(1)
        .max(365)
        .optional()
        .default(14)
        .describe("Aantal dagen terug vanaf nu. Default 14."),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .default(150)
        .describe("Aantal events per pagina. Default 150."),
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .default(0)
        .describe(
          "Startpositie voor paginering. Call opnieuw met offset = vorige_offset + limit tot er geen NEXT_PAGE meer is.",
        ),
    },
    async ({ project_id, days_back, limit, offset }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(
        supabase,
        "get_project_activity",
        `${project_id} days=${days_back} offset=${offset} limit=${limit}`,
      );

      const { rows: events, totalCount } = await getProjectActivityForReport(
        project_id,
        days_back,
        { limit, offset },
        supabase,
      );

      if (events.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Geen activity gevonden voor project ${project_id} in het venster van ${days_back} dagen.`,
            },
          ],
        };
      }

      const grouped = groupEventsByDay(events);
      const sortedDays = [...grouped.keys()].sort((a, b) => b.localeCompare(a));

      const sections: string[] = [];
      sections.push(`# Activity voor project (laatste ${days_back} dagen)`);

      const rangeStart = offset + 1;
      const rangeEnd = offset + events.length;
      sections.push(
        `Pagina: events ${rangeStart}-${rangeEnd} van ${totalCount} — ${events.length} events over ${sortedDays.length} dagen (op deze pagina)`,
      );

      for (const day of sortedDays) {
        const dayEvents = grouped.get(day) ?? [];
        sections.push(`## ${formatDate(day)}`);
        const lines = dayEvents.map((event) => {
          const time = formatTime(event.created_at);
          return `${formatEventLine(event)} _(${time})_`;
        });
        sections.push(lines.join("\n"));
      }

      const nextOffset = offset + events.length;
      if (nextOffset < totalCount) {
        sections.push(
          `---\nNEXT_PAGE: er zijn nog ${totalCount - nextOffset} events. Roep \`get_project_activity\` opnieuw aan met \`offset: ${nextOffset}\` (zelfde project_id en days_back) om door te bladeren.`,
        );
      } else {
        sections.push(`---\nEINDE: alle ${totalCount} events zijn opgehaald.`);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: sections.join("\n\n"),
          },
        ],
      };
    },
  );

  server.tool(
    "get_project_context",
    "Haal project-meta op: organisatie, owner, contactpersoon, status, deadline én de laatste AI-samenvattingen (context en briefing) uit de cockpit-pipeline. Gebruik deze tool als EERSTE stap bij rapportage — het geeft de achtergrond die Claude nodig heeft om het project-verhaal te begrijpen voordat hij issues en activity doorleest.",
    {
      project_id: z.string().uuid().describe("UUID van het project"),
    },
    async ({ project_id }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(supabase, "get_project_context", project_id);

      const context = await getProjectContextForReport(project_id, supabase);

      if (!context) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Project ${project_id} niet gevonden.`,
            },
          ],
        };
      }

      const sections: string[] = [];
      sections.push(`# ${context.name}`);

      const metaLines: string[] = [];
      if (context.organization) {
        metaLines.push(`**Organisatie:** ${context.organization.name}`);
      }
      metaLines.push(`**Status:** ${context.status}`);
      if (context.start_date) {
        metaLines.push(`**Startdatum:** ${formatDate(context.start_date)}`);
      }
      if (context.deadline) {
        metaLines.push(`**Deadline:** ${formatDate(context.deadline)}`);
      }
      if (context.owner_name) {
        metaLines.push(`**Owner:** ${context.owner_name}`);
      }
      if (context.contact_name) {
        const contactLine = context.contact_email
          ? `${context.contact_name} (${context.contact_email})`
          : context.contact_name;
        metaLines.push(`**Contactpersoon:** ${contactLine}`);
      }
      sections.push(metaLines.join("\n"));

      if (context.description) {
        sections.push("## Omschrijving");
        sections.push(context.description);
      }

      if (context.summaries.context) {
        sections.push("## Huidige context (AI-samenvatting)");
        sections.push(context.summaries.context);
      }

      if (context.summaries.briefing) {
        sections.push("## Briefing");
        sections.push(context.summaries.briefing);
      }

      if (!context.summaries.context && !context.summaries.briefing) {
        sections.push(
          "_Geen AI-samenvattingen beschikbaar voor dit project. Het rapport moet puur op issue-data gebaseerd worden._",
        );
      }

      return {
        content: [
          {
            type: "text" as const,
            text: sections.join("\n\n"),
          },
        ],
      };
    },
  );
}
