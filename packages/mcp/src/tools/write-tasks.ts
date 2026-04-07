import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAdminClient } from "@repo/database/supabase/admin";
import {
  createTaskFromExtraction,
  updateTask,
  completeTask,
  dismissTask,
} from "@repo/database/mutations/tasks";
import { findProfileIdByName } from "@repo/database/queries/people";
import { trackMcpQuery } from "./usage-tracking";

export function registerWriteTaskTools(server: McpServer) {
  // ── create_task ──────────────────────────────────────────────────────
  server.tool(
    "create_task",
    "Maak een nieuwe taak aan vanuit een extractie (actiepunt). De extractie moet al bestaan in de kennisbasis. Geef de naam van de aanmaker mee zodat de taak herleidbaar is.",
    {
      extraction_id: z
        .string()
        .uuid()
        .describe("UUID van de extractie (actiepunt) waaruit de taak wordt aangemaakt"),
      title: z.string().max(500).describe("Titel van de taak"),
      assigned_to_name: z
        .string()
        .max(255)
        .optional()
        .describe(
          "Naam van de persoon aan wie de taak wordt toegewezen (wordt opgezocht in profielen)",
        ),
      due_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Deadline in YYYY-MM-DD formaat"),
      created_by_name: z.string().max(255).describe("Naam van de persoon die de taak aanmaakt"),
      already_done: z
        .boolean()
        .optional()
        .default(false)
        .describe("Zet op true als de taak al afgerond is (wordt meteen op 'done' gezet)"),
    },
    async ({ extraction_id, title, assigned_to_name, due_date, created_by_name, already_done }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(supabase, "create_task", title);

      // Resolve profile IDs by name
      const createdById = await findProfileIdByName(created_by_name);
      if (!createdById) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Profiel voor "${created_by_name}" niet gevonden. Controleer de naam en probeer opnieuw.`,
            },
          ],
        };
      }

      let assignedToId: string | null = null;
      if (assigned_to_name) {
        assignedToId = await findProfileIdByName(assigned_to_name);
        if (!assignedToId) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Profiel voor toegewezen persoon "${assigned_to_name}" niet gevonden. Controleer de naam en probeer opnieuw.`,
              },
            ],
          };
        }
      }

      const result = await createTaskFromExtraction({
        extraction_id,
        title,
        assigned_to: assignedToId,
        due_date: due_date ?? null,
        created_by: createdById,
        already_done,
      });

      if ("error" in result) {
        return {
          content: [{ type: "text" as const, text: `Fout bij aanmaken taak: ${result.error}` }],
        };
      }

      const lines = [
        "## Taak aangemaakt",
        `**ID:** ${result.id}`,
        `**Titel:** ${title}`,
        `**Status:** ${already_done ? "done" : "active"}`,
        `**Aangemaakt door:** ${created_by_name}`,
      ];
      if (assigned_to_name) lines.push(`**Toegewezen aan:** ${assigned_to_name}`);
      if (due_date) lines.push(`**Deadline:** ${due_date}`);
      lines.push(`**Extractie:** ${extraction_id}`);

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    },
  );

  // ── complete_task ────────────────────────────────────────────────────
  server.tool(
    "complete_task",
    "Markeer een taak als afgerond. De taak krijgt status 'done' en een voltooiingstijdstempel.",
    {
      task_id: z.string().uuid().describe("UUID van de taak die afgerond moet worden"),
    },
    async ({ task_id }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(supabase, "complete_task", task_id);

      const result = await completeTask(task_id);

      if ("error" in result) {
        return {
          content: [{ type: "text" as const, text: `Fout bij afronden taak: ${result.error}` }],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `## Taak afgerond\n**ID:** ${task_id}\n**Status:** done\n**Afgerond op:** ${new Date().toISOString()}`,
          },
        ],
      };
    },
  );

  // ── update_task ──────────────────────────────────────────────────────
  server.tool(
    "update_task",
    "Werk een bestaande taak bij. Je kunt de titel, toewijzing en/of deadline wijzigen. Geef alleen de velden mee die je wilt veranderen.",
    {
      task_id: z.string().uuid().describe("UUID van de taak die bijgewerkt moet worden"),
      title: z
        .string()
        .max(500)
        .optional()
        .describe("Nieuwe titel (laat leeg om niet te wijzigen)"),
      assigned_to_name: z
        .string()
        .max(255)
        .optional()
        .describe("Naam van de nieuwe toegewezen persoon (wordt opgezocht in profielen)"),
      due_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Nieuwe deadline in YYYY-MM-DD formaat"),
    },
    async ({ task_id, title, assigned_to_name, due_date }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(supabase, "update_task", task_id);

      // Build update payload
      const updates: { assigned_to?: string | null; due_date?: string | null; title?: string } = {};

      if (title !== undefined) updates.title = title;
      if (due_date !== undefined) updates.due_date = due_date;

      if (assigned_to_name !== undefined) {
        const assignedToId = await findProfileIdByName(assigned_to_name);
        if (!assignedToId) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Profiel voor "${assigned_to_name}" niet gevonden. Controleer de naam en probeer opnieuw.`,
              },
            ],
          };
        }
        updates.assigned_to = assignedToId;
      }

      if (Object.keys(updates).length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Geen wijzigingen opgegeven. Geef minimaal één veld mee om te wijzigen.",
            },
          ],
        };
      }

      const result = await updateTask(task_id, updates);

      if ("error" in result) {
        return {
          content: [{ type: "text" as const, text: `Fout bij bijwerken taak: ${result.error}` }],
        };
      }

      const changes: string[] = [];
      if (title) changes.push(`Titel → "${title}"`);
      if (assigned_to_name) changes.push(`Toegewezen aan → ${assigned_to_name}`);
      if (due_date) changes.push(`Deadline → ${due_date}`);

      return {
        content: [
          {
            type: "text" as const,
            text: `## Taak bijgewerkt\n**ID:** ${task_id}\n**Wijzigingen:** ${changes.join(", ")}`,
          },
        ],
      };
    },
  );

  // ── dismiss_task ─────────────────────────────────────────────────────
  server.tool(
    "dismiss_task",
    "Wijs een taak af (niet relevant of per ongeluk aangemaakt). De taak krijgt status 'dismissed' en verdwijnt uit actieve lijsten.",
    {
      task_id: z.string().uuid().describe("UUID van de taak die afgewezen moet worden"),
    },
    async ({ task_id }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(supabase, "dismiss_task", task_id);

      const result = await dismissTask(task_id);

      if ("error" in result) {
        return {
          content: [{ type: "text" as const, text: `Fout bij afwijzen taak: ${result.error}` }],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `## Taak afgewezen\n**ID:** ${task_id}\n**Status:** dismissed`,
          },
        ],
      };
    },
  );
}
