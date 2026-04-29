# Micro Sprint WG-001: Widget Ingest Foundation

## Doel

De data-laag en het ingest-endpoint klaarzetten waar de eigen feedback-widget straks naartoe POST. Geen UI-werk, geen widget-app, alleen: een whitelist-tabel om abuse te voorkomen, een API-route op DevHub die feedback valideert en als nieuwe `issues`-rij wegschrijft (`source: 'jaip_widget'`), en de minimale projects-rij voor het JAIP-platform zelf zodat cockpit-feedback ergens kan landen. Bewust gescheiden van de widget-bundle (WG-002) zodat we los kunnen testen en deployen.

## Requirements

| ID         | Beschrijving                                                                                                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| WG-REQ-001 | Tabel `widget_allowed_projects` met `(project_id uuid, domain text, created_at timestamptz)`, PK `(project_id, domain)`, FK naar `projects.id ON DELETE CASCADE`                                                                           |
| WG-REQ-002 | Seed-rij voor `(<jaip_platform_project_id>, 'cockpit.jouw-ai-partner.nl')` zodat cockpit-feedback geaccepteerd wordt; idempotent via `ON CONFLICT DO NOTHING`                                                                              |
| WG-REQ-003 | Migratie maakt 1 projects-rij `name='JAIP Platform'` aan (of hergebruikt bestaande) met een vaste UUID die als env-var beschikbaar wordt — alleen als hij nog niet bestaat                                                                 |
| WG-REQ-004 | Query-helper `getAllowedDomainsForProject(projectId)` in `packages/database/src/queries/widget/access.ts`                                                                                                                                  |
| WG-REQ-005 | Mutation-helper `insertWidgetIssue(input)` in `packages/database/src/mutations/widget/feedback.ts` — wrapper rond bestaande `insertIssue` met `source='jaip_widget'`                                                                       |
| WG-REQ-006 | Zod-schema `widgetIngestSchema` in `packages/database/src/validations/widget.ts` — velden: `project_id` (uuid), `type` (`bug`/`idea`/`question`), `description` (10-10000 tekens), `context` (object met url/viewport/userAgent)           |
| WG-REQ-007 | Route `apps/devhub/src/app/api/ingest/widget/route.ts` (POST): valideer Origin tegen whitelist, valideer body via Zod, insert via `insertWidgetIssue`, return `{ success, issue_id }` of `{ error }`                                       |
| WG-REQ-008 | CORS-headers op de route: `Access-Control-Allow-Origin` dynamisch gespiegeld vanaf de Origin header **alleen als** die in whitelist voorkomt; anders 403                                                                                   |
| WG-REQ-009 | **Geen rate-limit voor MVP** — bewust geaccepteerd risico voor cockpit-only rollout (3 gebruikers, whitelist beperkt Origin tot bekende domeinen, low-stakes payload). Follow-up = WG-005, te activeren vóór eerste klant-rollout (WG-004) |
| WG-REQ-010 | Test-submissies (description matcht zelfde patronen als `isTestSubmission` uit userback.ts) krijgen `status='triage'` maar `labels: ['test']` zodat ze filterbaar zijn                                                                     |
| WG-REQ-011 | RLS op `widget_allowed_projects`: alleen authenticated admins (jaip_admin) kunnen rijen toevoegen/verwijderen                                                                                                                              |
| WG-REQ-012 | Observability: elke POST (success én fail) logt `{ project_id, origin, status, error_code? }` naar console (Vercel logs); count-metric voorbereid voor latere dashboard-uitbreiding                                                        |
| WG-REQ-013 | CSRF / Origin-spoof: expliciet geaccepteerd risico — Origin-header is spoofbaar via curl. Mitigatie is whitelist + low-stakes payload (geen auth-state). Documenteer in route-comment en `docs/security/audit-report.md`                   |

## Afhankelijkheden

- Bestaand: `issues`-tabel met `source`, `source_url`, `source_metadata`, `reporter_email` kolommen (DH-001)
- Bestaand: `insertIssue` mutation in `packages/database/src/mutations/issues/`
- Bestaand: Userback-pattern als referentie (`apps/devhub/src/app/api/ingest/userback/route.ts`, `packages/database/src/integrations/userback.ts`)

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- **Q1: Hergebruiken we een bestaande `projects`-rij voor "JAIP Platform" of maken we 'm vers aan?** Aanbeveling: vers aan, met `slug='jaip-platform'`, organisatie = Jouw AI Partner (intern). Conflict-handling op `slug` (niet alleen `id`) zodat re-runs in andere envs niet stuk gaan. Bevestigen vóór migratie.
- **Q2: Mag `project_id` in de script-tag een UUID zijn, of willen we een slug ervoor?** UUID is simpelst (direct match met `projects.id`), slug is human-friendly maar vraagt extra mapping-tabel. Aanbeveling V0: **UUID**.
- **Q3: Rate-limit ontbreekt — risico aanvaardbaar?** MVP-rollout is cockpit-only (3 gebruikers), Origin-whitelist beperkt actieve domeinen tot interne app. Risico: scriptkid die Origin spoofed kan endpoint floodden → spam in triage-queue (geen data-leak, alleen lawaai). Mitigatie als 't gebeurt: Origin-whitelist tijdelijk legen via admin-UI. Follow-up = WG-005 (Postgres-counter) vóór eerste klant-rollout.

## Taken

### 1. Migratie

`supabase/migrations/20260429000001_widget_allowed_projects.sql`:

```sql
-- 1. JAIP Platform project (zelf-feedback target voor cockpit/devhub/portal)
-- Conflict-handling op `slug` zodat re-runs in andere envs geen UUID-collision veroorzaken.
-- Als de slug al bestaat met een ander UUID, valt insert stil terug — env-var moet dan
-- gesynchroniseerd worden met het bestaande UUID (zie deployment.md).
INSERT INTO projects (id, name, slug, organization_id, status)
VALUES (
  '00000000-0000-4000-8000-00000000aa01'::uuid,
  'JAIP Platform',
  'jaip-platform',
  (SELECT id FROM organizations WHERE name = 'Jouw AI Partner'),
  'active'
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Whitelist-tabel
CREATE TABLE widget_allowed_projects (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  domain text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, domain)
);

CREATE INDEX idx_widget_allowed_domain ON widget_allowed_projects(domain);

-- 3. Seed cockpit-domein
INSERT INTO widget_allowed_projects (project_id, domain)
VALUES ('00000000-0000-4000-8000-00000000aa01'::uuid, 'cockpit.jouw-ai-partner.nl')
ON CONFLICT (project_id, domain) DO NOTHING;

-- 4. RLS
ALTER TABLE widget_allowed_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage whitelist" ON widget_allowed_projects
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'jaip_admin')
  );
```

### 2. Validatie

`packages/database/src/validations/widget.ts`:

```ts
import { z } from "zod";

export const widgetIngestSchema = z.object({
  project_id: z.string().uuid(),
  type: z.enum(["bug", "idea", "question"]),
  description: z.string().trim().min(10).max(10000),
  context: z.object({
    url: z.string().url(),
    viewport: z.object({ width: z.number(), height: z.number() }),
    user_agent: z.string().max(500),
  }),
  reporter_email: z.string().email().optional().nullable(),
});

export type WidgetIngestInput = z.infer<typeof widgetIngestSchema>;
```

### 3. Query + mutation

- `packages/database/src/queries/widget/access.ts`:

  ```ts
  export async function getAllowedDomainsForProject(projectId: string, client?: SupabaseClient) {
    const db = client ?? getAdminClient();
    const { data } = await db
      .from("widget_allowed_projects")
      .select("domain")
      .eq("project_id", projectId);
    return (data ?? []).map((r) => r.domain);
  }

  export async function isOriginAllowedForProject(
    projectId: string,
    origin: string,
    client?: SupabaseClient,
  ): Promise<boolean> {
    const host = new URL(origin).hostname;
    const domains = await getAllowedDomainsForProject(projectId, client);
    return domains.includes(host);
  }
  ```

- `packages/database/src/mutations/widget/feedback.ts`:

  ```ts
  export async function insertWidgetIssue(input: WidgetIngestInput, client?: SupabaseClient) {
    return insertIssue(
      {
        project_id: input.project_id,
        title: extractFirstLine(input.description),
        description: input.description,
        type:
          input.type === "idea"
            ? "feature_request"
            : input.type === "question"
              ? "question"
              : "bug",
        priority: "medium",
        status: "triage",
        source: "jaip_widget",
        source_url: input.context.url,
        source_metadata: {
          viewport: input.context.viewport,
          user_agent: input.context.user_agent,
          submitted_at: new Date().toISOString(),
        },
        reporter_email: input.reporter_email ?? null,
        labels: isTestSubmission(input.description) ? ["test"] : [],
      },
      client,
    );
  }
  ```

### 4. API-route

`apps/devhub/src/app/api/ingest/widget/route.ts`:

```ts
import { NextResponse } from "next/server";
import { widgetIngestSchema } from "@repo/database/validations/widget";
import { isOriginAllowedForProject } from "@repo/database/queries/widget/access";
import { insertWidgetIssue } from "@repo/database/mutations/widget/feedback";

// MVP: geen rate-limit. Bewust geaccepteerd risico (zie WG-REQ-009/013).
// Rate-limit komt in WG-005 vóór eerste klant-rollout.
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return NextResponse.json({ error: "no_origin" }, { status: 403 });

  const body = await req.json();
  const parsed = widgetIngestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const allowed = await isOriginAllowedForProject(parsed.data.project_id, origin);
  if (!allowed) return NextResponse.json({ error: "origin_not_allowed" }, { status: 403 });

  const issue = await insertWidgetIssue(parsed.data);
  return NextResponse.json(
    { success: true, issue_id: issue.id },
    {
      headers: { "Access-Control-Allow-Origin": origin, Vary: "Origin" },
    },
  );
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });
}
```

> Let op: de OPTIONS-handler spiegelt `origin` ongefilterd terug — niet erg voor preflight zelf, maar de échte authorisatie zit in de POST. Documenteer dit zodat security review later niet schrikt.

### 5. Observability

In de POST-handler na elke afhandeling:

```ts
console.log(
  JSON.stringify({
    type: "widget_ingest",
    project_id: parsed.data?.project_id ?? null,
    origin,
    status: response.status,
    error_code: errorCode ?? null,
    ts: new Date().toISOString(),
  }),
);
```

Vercel logs zijn doorzoekbaar; later wordt dit een metric in een agent-dashboard. Geen losse infra nodig voor V0.

### 6. CLAUDE.md update

Voeg `widget` toe aan platform-actions-rij van DevHub in de feature-registry (sectie "Feature-structuur").

## Acceptatiecriteria

- [ ] WG-REQ-001..003: migratie draait schoon op staging, JAIP Platform-project en seed-rij aanwezig
- [ ] WG-REQ-004..006: queries, mutations, validation hebben elk een unit-test
- [ ] WG-REQ-007: POST met geldige body + whitelisted Origin → 200 + nieuwe issue-rij in DB
- [ ] WG-REQ-008: POST vanaf niet-whitelisted Origin → 403, geen DB-write
- [ ] WG-REQ-009: route bevat een comment dat rate-limit bewust ontbreekt voor MVP, met verwijzing naar WG-005
- [ ] WG-REQ-010: description matcht test-pattern → label `'test'` op issue
- [ ] WG-REQ-011: RLS-policy: niet-admin profile kan geen rij in whitelist toevoegen
- [ ] WG-REQ-012: Vercel-logs tonen één JSON-regel per POST (success én fail), doorzoekbaar op `widget_ingest`
- [ ] WG-REQ-013: route-comment + `docs/security/audit-report.md` documenteert Origin-spoof én ontbrekende rate-limit als geaccepteerd MVP-risico
- [ ] Migratie draait twee keer schoon (idempotency-test) zonder UUID-collision
- [ ] `npm run check:queries` blijft groen (geen directe `.from()` in actions/api)
- [ ] Type-check + lint slagen

## Risico's

| Risico                                                       | Mitigatie                                                                                                                                                  |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Geen rate-limit → flood mogelijk via Origin-spoof            | Geaccepteerd MVP-risico (WG-REQ-009). Mitigatie als 't gebeurt: Origin-whitelist leegmaken via admin-UI. WG-005 lost het structureel op vóór klant-rollout |
| `JAIP Platform`-project kruipt door als gewoon klant-project | Filter `slug = 'jaip-platform'` overal waar projecten in klant-UI komen — toevoegen aan portal/devhub queries als follow-up                                |
| CORS dynamisch spiegelen lijkt op `*` voor verkeerde Origins | Spiegelen alleen na whitelist-check; preflight is intentioneel permissief                                                                                  |
| Origin-header spoofbaar via curl                             | Geaccepteerd risico (WG-REQ-013) — payload is low-stakes, geen auth-state. Mitigatie zit in whitelist; rate-limit erbij in WG-005                          |

## Bronverwijzingen

- Bestaand pattern: `apps/devhub/src/app/api/ingest/userback/route.ts`, `packages/database/src/integrations/userback.ts`
- CLAUDE.md: Database & Queries, Security (drie lagen)
- Vision §Delivery-quadrant: feedback-widget op shipped products

## Vision-alignment

Vision §Delivery — feedback-widget op shipped products is dé brug van Delivery → DevHub. V0 is JAIP-eigen platform (cockpit) als shipped product; later breidt het uit naar klant-apps via dezelfde whitelist-tabel.
