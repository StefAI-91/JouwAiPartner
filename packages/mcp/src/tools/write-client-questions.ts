import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@repo/database/supabase/admin";
import { sendQuestion } from "@repo/database/mutations/client-questions";
import { findProfileIdByName } from "@repo/database/queries/people";
import { getProfileRole } from "@repo/database/queries/team";
import { escapeLike, sanitizeForContains, resolveOrganizationIds } from "./utils";
import { trackMcpQuery } from "./usage-tracking";

/**
 * PR-025 — `ask_client_question`: dev (via Claude Code/Desktop) plaatst een
 * vraag in de portal-inbox van een klantproject. Plumbing leeft al in de
 * `client_questions`-tabel + `sendQuestion`-mutation; deze tool is alleen
 * een schrijf-ingang vanuit MCP.
 *
 * Identity: de tool neemt `asked_by_name` als parameter en resolved naar
 * `profile_id` via `findProfileIdByName` (zelfde patroon als `create_task`
 * met `created_by_name`). Een env-var-aanpak werkte niet: de MCP-server
 * draait als HTTP endpoint in de cockpit-deploy, dus één env-vars-set voor
 * alle devs — verkeerde afzender. Een naam in de tool-call werkt zowel
 * lokaal als in productie en matcht hoe Claude andere write-tools al
 * aanroept. RLS blokkeert client-rol op INSERT (PR-SEC-031), dus we
 * weigeren extra defensief op application-niveau wanneer de gevonden
 * profiel-rol geen team-rol is.
 *
 * Project-resolutie: óf direct via `project_id` (UUID), óf fuzzy via
 * `organization_name + project_name`. De UUID-vorm is de happy-path voor
 * een dev die het project al weet; de naam-vorm is de fallback voor
 * ad-hoc gebruik. Geen impliciete project-detectie uit de werkmap — te
 * fragiel, een audit-trail die op `pwd` leunt is geen audit-trail.
 */

interface ResolvedProject {
  project_id: string;
  organization_id: string;
  project_name: string;
  organization_name: string;
}

async function resolveProject(
  supabase: SupabaseClient,
  input: {
    project_id?: string;
    organization_name?: string;
    project_name?: string;
  },
): Promise<ResolvedProject | { error: string }> {
  if (input.project_id) {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, organization_id, organizations(name)")
      .eq("id", input.project_id)
      .maybeSingle();

    if (error) return { error: `Project lookup mislukt: ${error.message}` };
    if (!data) return { error: `Project met id ${input.project_id} niet gevonden.` };
    if (!data.organization_id) {
      return {
        error: `Project ${input.project_id} heeft geen organisatie — kan geen vraag uitzetten.`,
      };
    }
    const orgName =
      (data as unknown as { organizations: { name: string } | null }).organizations?.name ??
      "Onbekend";
    return {
      project_id: data.id as string,
      organization_id: data.organization_id as string,
      project_name: data.name as string,
      organization_name: orgName,
    };
  }

  if (!input.organization_name || !input.project_name) {
    return {
      error:
        "Geef óf project_id, óf organization_name + project_name op om het project te bepalen.",
    };
  }

  const orgIds = await resolveOrganizationIds(supabase, input.organization_name);
  if (!orgIds || orgIds.length === 0) {
    return { error: `Organisatie "${input.organization_name}" niet gevonden.` };
  }

  const escaped = escapeLike(input.project_name);
  const sanitized = sanitizeForContains(input.project_name);
  const { data: matches, error } = await supabase
    .from("projects")
    .select("id, name, organization_id, organizations(name)")
    .in("organization_id", orgIds)
    .or(`name.ilike.%${escaped}%,aliases.cs.{${sanitized}}`)
    .limit(2);

  if (error) return { error: `Project lookup mislukt: ${error.message}` };
  if (!matches || matches.length === 0) {
    return {
      error: `Project "${input.project_name}" niet gevonden binnen organisatie "${input.organization_name}".`,
    };
  }
  if (matches.length > 1) {
    const names = matches.map((m: { name: string }) => `"${m.name}"`).join(", ");
    return {
      error: `Meerdere projecten matchen "${input.project_name}" binnen "${input.organization_name}": ${names}. Geef project_id op om eenduidig te kiezen.`,
    };
  }

  const m = matches[0] as unknown as {
    id: string;
    name: string;
    organization_id: string;
    organizations: { name: string } | null;
  };
  return {
    project_id: m.id,
    organization_id: m.organization_id,
    project_name: m.name,
    organization_name: m.organizations?.name ?? input.organization_name,
  };
}

function getPortalBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_PORTAL_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  return process.env.NODE_ENV === "production"
    ? "https://jouw-ai-partner-portal.vercel.app"
    : "http://localhost:3002";
}

/**
 * Convert YYYY-MM-DD → ISO 8601 datetime (eind-van-dag UTC) zodat de
 * `sendQuestionSchema.due_date.datetime()`-validator het accepteert. Datum
 * is gebruiksvriendelijker voor een MCP-call dan een volledige ISO-string.
 */
function dueDateToIso(date: string): string {
  return `${date}T23:59:59.000Z`;
}

export function registerWriteClientQuestionTools(server: McpServer) {
  server.tool(
    "ask_client_question",
    [
      "Stel een vraag aan de klant via de portal-inbox.",
      "Gebruik dit alleen voor klant-blokkerende vragen tijdens development — beslissingen die het team niet zelf kan maken (UX-keuzes, content, business-rules).",
      "Niet gebruiken voor: interne afwegingen, vragen die in de spec staan, of dingen die je zelf kunt opzoeken.",
      "De vraag verschijnt direct in /projects/<id>/inbox op de portal; de klant krijgt geen automatische notificatie (wordt los geregeld).",
      "Geef óf project_id (UUID, voorkeur) óf organization_name + project_name.",
    ].join(" "),
    {
      project_id: z
        .string()
        .uuid()
        .optional()
        .describe("UUID van het project. Voorkeur boven naam-resolutie."),
      organization_name: z
        .string()
        .max(255)
        .optional()
        .describe(
          "Naam van de organisatie (fuzzy match). Vereist samen met project_name als project_id ontbreekt.",
        ),
      project_name: z
        .string()
        .max(255)
        .optional()
        .describe("Naam van het project (fuzzy match binnen de organisatie)."),
      body: z
        .string()
        .min(10)
        .max(2000)
        .describe(
          "De vraag aan de klant. Min 10, max 2000 tekens. Wees specifiek en geef context.",
        ),
      asked_by_name: z
        .string()
        .max(255)
        .describe(
          "Naam van het teamlid dat de vraag stelt (wordt opgezocht in profielen). Bepaalt wie de portal als afzender toont.",
        ),
      due_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe(
          "Optionele deadline (YYYY-MM-DD). Wordt opgeslagen, geen reminder-systeem in v1.",
        ),
      topic_id: z
        .string()
        .uuid()
        .optional()
        .describe("Koppel de vraag aan een bestaande topic (UUID). Niet samen met issue_id."),
      issue_id: z
        .string()
        .uuid()
        .optional()
        .describe("Koppel de vraag aan een bestaand issue (UUID). Niet samen met topic_id."),
    },
    async ({
      project_id,
      organization_name,
      project_name,
      body,
      asked_by_name,
      due_date,
      topic_id,
      issue_id,
    }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(supabase, "ask_client_question", body.slice(0, 80));

      const senderId = await findProfileIdByName(asked_by_name);
      if (!senderId) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Geen team-profiel gevonden voor "${asked_by_name}". Controleer de naam of voeg het profiel toe via cockpit /admin/team.`,
            },
          ],
        };
      }

      // Defense-in-depth: RLS-INSERT op client_questions blokkeert client-rol
      // (PR-SEC-031), maar een match op `findProfileIdByName` kan ook een
      // client-rij raken (bijv. portal-user met dezelfde voornaam als een
      // teamlid). Expliciet weigeren op application-niveau geeft een leesbare
      // foutmelding i.p.v. een raw RLS-violation.
      const role = await getProfileRole(senderId, supabase);
      if (role !== "admin" && role !== "member") {
        return {
          content: [
            {
              type: "text" as const,
              text: `Profiel "${asked_by_name}" heeft geen team-rol (role=${role ?? "onbekend"}). Alleen team-leden kunnen vragen aan klanten stellen.`,
            },
          ],
        };
      }

      const project = await resolveProject(supabase, {
        project_id,
        organization_name,
        project_name,
      });
      if ("error" in project) {
        return { content: [{ type: "text" as const, text: project.error }] };
      }

      const result = await sendQuestion(
        {
          project_id: project.project_id,
          organization_id: project.organization_id,
          body,
          due_date: due_date ? dueDateToIso(due_date) : null,
          topic_id: topic_id ?? null,
          issue_id: issue_id ?? null,
        },
        senderId,
        supabase,
      );

      if ("error" in result) {
        return {
          content: [{ type: "text" as const, text: `Fout bij plaatsen vraag: ${result.error}` }],
        };
      }

      const portalUrl = `${getPortalBaseUrl()}/projects/${project.project_id}/inbox`;
      const lines = [
        "## Vraag geplaatst in portal-inbox",
        `**Vraag-ID:** ${result.data.id}`,
        `**Project:** ${project.project_name} (${project.organization_name})`,
        `**Afzender:** ${asked_by_name}`,
        `**Status:** open`,
        `**Portal:** ${portalUrl}`,
      ];
      if (due_date) lines.push(`**Deadline:** ${due_date}`);
      lines.push(
        "",
        "_De klant ziet deze vraag in zijn portal-inbox. E-mail-notificatie volgt in een latere sprint — vraag de klant tot die tijd handmatig om te kijken._",
      );

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    },
  );
}
