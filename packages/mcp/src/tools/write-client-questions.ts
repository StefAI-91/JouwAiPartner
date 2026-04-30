import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@repo/database/supabase/admin";
import { sendQuestion } from "@repo/database/mutations/client-questions";
import { getProfileRole, getProfileNameById } from "@repo/database/queries/team";
import { escapeLike, sanitizeForContains, resolveOrganizationIds } from "./utils";
import { trackMcpQuery } from "./usage-tracking";

/**
 * PR-025 — `ask_client_question`: dev (via Claude Code/Desktop) plaatst een
 * vraag in de portal-inbox van een klantproject. Plumbing leeft al in de
 * `client_questions`-tabel + `sendQuestion`-mutation; deze tool is alleen
 * een schrijf-ingang vanuit MCP.
 *
 * Identity: `sender_profile_id` komt uit env-var `MCP_SENDER_PROFILE_ID`. Per
 * dev een ander profiel zodat de portal-thread "Stef vraagt" toont, niet een
 * gedeelde Claude-Code-bot. De env wordt op eerste tool-call gevalideerd
 * (UUID + bestaand profiel + role admin/member) en daarna in module-scope
 * gecached om bij elke vraag een DB-roundtrip te besparen.
 *
 * Project-resolutie: óf direct via `project_id` (UUID), óf fuzzy via
 * `organization_name + project_name`. De UUID-vorm is de happy-path voor een
 * dev die het project al weet; de naam-vorm is de fallback voor ad-hoc
 * gebruik. Geen impliciete project-detectie uit de werkmap — te fragiel,
 * een audit-trail die op `pwd` leunt is geen audit-trail.
 */

const ENV_KEY = "MCP_SENDER_PROFILE_ID";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SenderIdentity {
  profile_id: string;
  display_name: string;
}

let cachedSender: SenderIdentity | null = null;

/**
 * Resolve and cache the team-profile that the MCP-server writes questions on
 * behalf of. Throws when the env-var ontbreekt of naar een ongeldig profiel
 * verwijst — bedoeld voor fail-fast bij eerste tool-call.
 *
 * @internal Geëxporteerd voor tests; productie-callers gaan via de tool-handler.
 */
export async function resolveSenderProfileId(client?: SupabaseClient): Promise<SenderIdentity> {
  if (cachedSender) return cachedSender;

  const raw = process.env[ENV_KEY];
  if (!raw) {
    throw new Error(
      `${ENV_KEY} is niet gezet. ask_client_question vereist een team-profiel-ID als afzender — zie packages/mcp/README.md voor de MCP-config.`,
    );
  }

  const trimmed = raw.trim();
  if (!UUID_RE.test(trimmed)) {
    throw new Error(`${ENV_KEY}="${trimmed}" is geen geldig UUID.`);
  }

  const role = await getProfileRole(trimmed, client);
  if (!role) {
    throw new Error(
      `${ENV_KEY} verwijst naar een onbekend profiel (${trimmed}). Controleer dat de UUID overeenkomt met een rij in 'profiles'.`,
    );
  }
  if (role !== "admin" && role !== "member") {
    throw new Error(
      `${ENV_KEY} verwijst naar een profiel met role='${role}'. Alleen admin/member mogen vragen aan klanten stellen.`,
    );
  }

  const display = (await getProfileNameById(trimmed, client)) ?? trimmed;
  cachedSender = { profile_id: trimmed, display_name: display };
  return cachedSender;
}

/** @internal Test-only — resets de identity-cache tussen tests. */
export function _resetSenderCacheForTests(): void {
  cachedSender = null;
}

interface ResolvedProject {
  project_id: string;
  organization_id: string;
  project_name: string;
  organization_name: string;
}

/**
 * Resolve a project from either its UUID or an `(organization_name,
 * project_name)`-paar. UUID-pad doet één lookup; naam-pad combineert de
 * bestaande `resolveOrganizationIds` met een project-naam-filter binnen de
 * gevonden orgs zodat ambiguïteit (twee orgs met "Demo"-project) opgelost
 * wordt door de org-naam.
 */
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
    async ({ project_id, organization_name, project_name, body, due_date, topic_id, issue_id }) => {
      const supabase = getAdminClient();
      await trackMcpQuery(supabase, "ask_client_question", body.slice(0, 80));

      let sender: SenderIdentity;
      try {
        sender = await resolveSenderProfileId(supabase);
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Fout: ${err instanceof Error ? err.message : String(err)}`,
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
        sender.profile_id,
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
        `**Afzender:** ${sender.display_name}`,
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
