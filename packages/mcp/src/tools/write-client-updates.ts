import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@repo/database/supabase/admin";
import { insertManualMeeting } from "@repo/database/mutations/meetings";
import { insertExtractions } from "@repo/database/mutations/extractions";
import { findProfileIdByName } from "@repo/database/queries/people";
import { resolveOrganizationIds } from "./utils";
import { trackMcpQuery } from "./usage-tracking";

const CHANNEL_TO_MEETING_TYPE: Record<string, string> = {
  phone_call: "phone_call",
  email: "email_update",
  whatsapp: "chat_message",
  chat: "chat_message",
  teams: "chat_message",
  slack: "chat_message",
  other: "other",
};

const CHANNEL_LABELS: Record<string, string> = {
  phone_call: "Telefoongesprek",
  email: "E-mail",
  whatsapp: "WhatsApp",
  chat: "Chat",
  teams: "Teams",
  slack: "Slack",
  other: "Overig",
};

const extractionSchema = z.object({
  type: z.enum(["decision", "action_item", "need", "insight"]).describe(
    "Type extractie: decision (besluit), action_item (actiepunt), need (behoefte), insight (inzicht)",
  ),
  content: z.string().max(2000).describe("Inhoud van de extractie"),
  assignee: z.string().max(255).optional().describe("Naam van verantwoordelijke (alleen bij action_item)"),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("Deadline in YYYY-MM-DD (alleen bij action_item)"),
});

export function registerWriteClientUpdateTools(server: McpServer) {
  server.tool(
    "log_client_update",
    [
      "Log een klantupdate vanuit een telefoongesprek, e-mail, WhatsApp of ander kanaal.",
      "Maakt een meeting-record aan met extracties (besluiten, actiepunten, behoeften, inzichten).",
      "De update komt in de review queue als draft en moet geverifieerd worden.",
      "Tip: je kunt een hele e-mail of gespreksnotitie plakken — Claude haalt de kern eruit en vult de extracties in.",
    ].join(" "),
    {
      channel: z
        .enum(["phone_call", "email", "whatsapp", "chat", "teams", "slack", "other"])
        .describe("Communicatiekanaal: phone_call, email, whatsapp, chat, teams, slack, other"),
      title: z.string().max(500).describe("Korte titel, bijv. 'Telefoongesprek Acme over deadline'"),
      organization_name: z
        .string()
        .max(255)
        .optional()
        .describe("Naam van de organisatie (wordt opgezocht in de database)"),
      summary: z.string().max(5000).describe("Samenvatting van het contact. Mag uitgebreid zijn."),
      participants: z
        .array(z.string().max(255))
        .optional()
        .describe("Namen van betrokkenen bij dit contact"),
      party_type: z
        .enum(["client", "partner", "internal", "other"])
        .optional()
        .default("client")
        .describe("Type partij: client (standaard), partner, internal, other"),
      extractions: z
        .array(extractionSchema)
        .optional()
        .describe("Extracties: besluiten, actiepunten, behoeften, inzichten. Laat leeg als er geen concrete items zijn."),
      reported_by: z.string().max(255).describe("Naam van de persoon die dit logt"),
    },
    async ({
      channel,
      title,
      organization_name,
      summary,
      participants,
      party_type,
      extractions,
      reported_by,
    }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(supabase, "log_client_update", `${channel}: ${title}`);

      // Resolve organization
      let organizationId: string | null = null;
      let unmatchedOrg: string | null = null;
      if (organization_name) {
        const orgIds = await resolveOrganizationIds(supabase, organization_name);
        if (orgIds && orgIds.length > 0) {
          organizationId = orgIds[0];
        } else {
          unmatchedOrg = organization_name;
        }
      }

      // Resolve reporter to include in participants
      const allParticipants = participants ?? [];
      if (reported_by && !allParticipants.includes(reported_by)) {
        allParticipants.push(reported_by);
      }

      // Create meeting record
      const meetingResult = await insertManualMeeting({
        title,
        date: new Date().toISOString(),
        summary,
        meeting_type: CHANNEL_TO_MEETING_TYPE[channel] ?? "other",
        party_type,
        organization_id: organizationId,
        participants: allParticipants,
      });

      if ("error" in meetingResult) {
        return {
          content: [{ type: "text" as const, text: `Fout bij aanmaken meeting: ${meetingResult.error}` }],
        };
      }

      const meetingId = meetingResult.data.id;

      // Insert extractions if provided
      let extractionCount = 0;
      if (extractions && extractions.length > 0) {
        const rows = extractions.map((ext: { type: string; content: string; assignee?: string; deadline?: string }) => ({
          meeting_id: meetingId,
          type: ext.type,
          content: ext.content,
          confidence: 1.0,
          transcript_ref: null,
          metadata: {
            ...(ext.assignee ? { assignee: ext.assignee } : {}),
            ...(ext.deadline ? { deadline: ext.deadline } : {}),
            source: "manual",
            reported_by,
          },
          project_id: null,
          embedding_stale: true,
          verification_status: "draft",
        }));

        const extResult = await insertExtractions(rows);
        if ("error" in extResult) {
          return {
            content: [
              {
                type: "text" as const,
                text: [
                  `## Meeting aangemaakt, maar fout bij extracties`,
                  `**Meeting ID:** ${meetingId}`,
                  `**Fout:** ${extResult.error}`,
                  "",
                  "De meeting is wel aangemaakt. Extracties kunnen handmatig worden toegevoegd via het dashboard.",
                ].join("\n"),
              },
            ],
          };
        }
        extractionCount = extResult.count;
      }

      // Build response
      const channelLabel = CHANNEL_LABELS[channel] ?? channel;
      const lines = [
        `## ${channelLabel} gelogd`,
        `**Meeting ID:** ${meetingId}`,
        `**Titel:** ${title}`,
        `**Kanaal:** ${channelLabel}`,
        `**Status:** draft (verschijnt in review queue)`,
      ];

      if (organizationId) {
        lines.push(`**Organisatie:** ${organization_name} (gekoppeld)`);
      } else if (unmatchedOrg) {
        lines.push(`**Organisatie:** ${unmatchedOrg} (niet gevonden in database — handmatig koppelen)`);
      }

      if (allParticipants.length > 0) {
        lines.push(`**Betrokkenen:** ${allParticipants.join(", ")}`);
      }

      lines.push(`**Gerapporteerd door:** ${reported_by}`);

      if (extractionCount > 0) {
        const typeCounts: Record<string, number> = {};
        for (const ext of extractions!) {
          typeCounts[ext.type] = (typeCounts[ext.type] ?? 0) + 1;
        }
        const typeLabels: Record<string, string> = {
          decision: "besluit(en)",
          action_item: "actiepunt(en)",
          need: "behoeften",
          insight: "inzicht(en)",
        };
        const parts = Object.entries(typeCounts).map(
          ([type, count]) => `${count} ${typeLabels[type] ?? type}`,
        );
        lines.push(`**Extracties:** ${parts.join(", ")}`);
      } else {
        lines.push("**Extracties:** geen (alleen samenvatting opgeslagen)");
      }

      lines.push("", "De update is opgeslagen als draft en verschijnt in de review queue voor verificatie.");

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    },
  );
}
