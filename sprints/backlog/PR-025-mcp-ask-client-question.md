# Micro Sprint PR-025: MCP-tool `ask_client_question`

## Doel

Claude Code én Claude Desktop in staat stellen om tijdens development een vraag rechtstreeks in de portal-inbox van een klantproject te plaatsen. Plumbing voor de inbox bestaat al (PR-022/PR-023): `client_questions`-tabel, `sendQuestion`-mutation en de portal-pagina die open vragen rendert. Wat ontbreekt is een **schrijf-ingang vanuit de MCP-server**, zodat een dev die tijdens een sprint tegen een productvraag aanloopt ("welke datum-format wil je in de export?") die direct bij de klant kan uitzetten zonder de UI te openen.

E-mail- of Slack-notificatie naar de klant valt **buiten scope** — dat parkeren we als follow-up sprint. Dit sprint maakt alleen het schrijfpad.

## Requirements

| ID         | Beschrijving                                                                                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-MCP-080 | Nieuwe MCP-tool `ask_client_question` geregistreerd in `packages/mcp/src/server.ts` via een nieuwe `registerWriteClientQuestionTools` (analoog aan `registerWriteClientUpdateTools`).    |
| PR-MCP-081 | Tool-input: `project` (by `id` óf `organization_name + project_name`), `body` (string, max 4000), optioneel `due_date` (YYYY-MM-DD), optioneel `topic_id`, optioneel `issue_id`.         |
| PR-MCP-082 | Identity: `sender_profile_id` komt uit env-var `MCP_SENDER_PROFILE_ID`. Server faalt bij startup als de var ontbreekt of geen geldige `profiles.id` met `role IN ('admin','member')` is. |
| PR-MCP-083 | Project-resolutie volgt patroon uit `write-tasks.ts` / `write-client-updates.ts`: probeer eerst `id`, anders fuzzy-match via organization+project (utils).                               |
| PR-MCP-084 | Tool roept `sendQuestion(input, senderProfileId, adminClient)` aan (bestaande mutation, niet aanpassen). Geen directe `.from()` in de tool.                                              |
| PR-MCP-085 | Tool-output: `{ question_id, project_name, organization_name, portal_url }` waarbij `portal_url` linkt naar `/projects/<id>/inbox` op de portal-host (env `NEXT_PUBLIC_PORTAL_URL`).     |
| PR-MCP-086 | `trackMcpQuery` aangeroepen voor usage-tracking (zelfde patroon als andere write-tools).                                                                                                 |
| PR-MCP-087 | Tool-description noemt expliciet wanneer wél/niet gebruiken: "wel" = klant-blokkerende vraag tijdens dev; "niet" = interne afweging die het team zelf kan maken.                         |
| PR-DOC-090 | `docs/ops/deployment.md` krijgt een sectie "MCP env vars" met `MCP_SENDER_PROFILE_ID` (per dev) en `NEXT_PUBLIC_PORTAL_URL`. Voorbeeld-config voor Claude Desktop én Claude Code.        |
| PR-DOC-091 | `packages/mcp/README.md` (of nieuwe sectie) documenteert installatie voor Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`) en Claude Code (`mcp add`). |

## Afhankelijkheden

- **PR-022** (client_questions DB + mutations) — done, enige consument is `sendQuestion`
- **PR-023** (portal inbox UI) — done, geen wijzigingen nodig
- **Geen DB-wijzigingen.** Geen migraties, geen RLS-aanpassing — RLS staat al toe dat een team-rol root-vragen schrijft (PR-SEC-031).

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- **Throttling / spam-guard?** Als Claude Code aan elke productvraag denkt, kan een dev de inbox onbedoeld vol-spammen. **Aanbeveling**: skip in deze sprint. De tool-description moet de dev sturen ("alleen klant-blokkerende vragen"); een rate-limit voegen we toe als het in de praktijk misgaat. Een `pending_questions_count` in de tool-output zou wel helpen — overwegen.
- **Replies via MCP?** Een dev wil mogelijk ook reageren op een klant-antwoord vanuit Claude Code. **Aanbeveling**: out-of-scope. Eerst de root-flow valideren; reply-tool kan een follow-up sprint worden.
- **Project-context impliciet?** Kunnen we het actieve project afleiden uit de werkomgeving (bv. `pwd` of git-remote)? **Aanbeveling**: nee — te fragiel, expliciete project-naam in de tool-call houdt de audit-trail schoon.

## Visuele referentie

Geen UI-werk. De vraag verschijnt automatisch in de bestaande portal-inbox (`apps/portal/src/app/(app)/projects/[id]/inbox/page.tsx`).

## Taken

### 1. Tool implementeren

- `packages/mcp/src/tools/write-client-questions.ts`:
  - Zod-schema voor input (project-discriminator + body + optionele velden).
  - Validate `MCP_SENDER_PROFILE_ID` bij eerste aanroep (cache-check); bij missing → throw met heldere error.
  - Resolve project → projectId + organizationId (hergebruik `resolveOrganizationIds` of vergelijkbare util).
  - Roep `sendQuestion({ project_id, organization_id, body, due_date, topic_id, issue_id }, senderProfileId, getAdminClient())`.
  - Bij `MutationResult.error` → tool-error met de mutation-message.
  - Bij success → return `{ question_id, project_name, organization_name, portal_url }`.
  - `trackMcpQuery({ tool: 'ask_client_question', success })`.

- `packages/mcp/src/server.ts`: import + register de nieuwe tool-set.

### 2. Identity-bootstrap

- Helper `resolveSenderProfileId(client?)` in dezelfde file:
  - Lees env, valideer UUID-format, lookup in `profiles` (via `findProfileById` query — toevoegen als die nog niet bestaat in `packages/database/src/queries/people.ts`).
  - Eis `role IN ('admin','member')`. Anders: throw.
  - Cache het resultaat in een module-scope `let` zodat we niet bij elke tool-call een DB-roundtrip doen.

### 3. Tests

- `packages/mcp/__tests__/tools/write-client-questions.test.ts`:
  - Boundary-mock op `sendQuestion` (mutation = grens want het is `@repo/database/mutations/*`? **Nee** — interne code, niet mocken). In plaats daarvan: payload-capture-mock op de Supabase-admin-client (zelfde patroon als andere write-tool tests).
  - Cases:
    1. Happy path: project by id → `sendQuestion`-payload bevat juiste velden + `sender_profile_id` uit env.
    2. Project by `organization_name + project_name` → resolve werkt.
    3. Missing `MCP_SENDER_PROFILE_ID` → tool throwt heldere error.
    4. `MCP_SENDER_PROFILE_ID` verwijst naar profile met `role='client'` → afgewezen.
    5. Body > 4000 chars → Zod-error vóór DB-call.
    6. Output bevat correcte `portal_url`.

### 4. Documentatie

- `docs/ops/deployment.md` — sectie "MCP env vars":

  ```
  MCP_SENDER_PROFILE_ID  — UUID van het team-profiel dat als afzender geldt
                          voor write-tools (ask_client_question). Per dev anders.
  NEXT_PUBLIC_PORTAL_URL — base-URL van de portal voor deeplinks in tool-output.
  ```

- `packages/mcp/README.md` — installatie-snippets voor:
  - Claude Desktop (`claude_desktop_config.json`)
  - Claude Code (`claude mcp add` commando)
  - In beide: env-vars setten incl. `MCP_SENDER_PROFILE_ID`.

### 5. Manual verification

- Tool aanroepen via Claude Code in deze repo: `ask_client_question` met `project="JouwAIPartner / Demo"`, `body="Welk datum-format wil je in de export?"`.
- Verifieer in Supabase: row in `client_questions` met juiste `sender_profile_id`, `project_id`, `organization_id`, `status='open'`.
- Open de portal-inbox-pagina van het Demo-project — vraag verschijnt bovenaan.
- Beantwoord via portal als test-klant — `status` flipt naar `responded` (bestaand gedrag uit PR-022).

## Out of scope

- E-mail-/Slack-notificatie aan de klant bij nieuwe vraag (volgende sprint).
- Reply-tool vanuit MCP.
- Rate-limiting / spam-guard.
- Auto-detectie van actief project op basis van werkmap/git-remote.
- UI-aanpassingen in portal of devhub.

## Definition of done

- [ ] Tool `ask_client_question` geregistreerd, schema gevalideerd, payload-capture tests groen.
- [ ] `MCP_SENDER_PROFILE_ID` gevalideerd bij startup; ontbreken → heldere error.
- [ ] Manual verification gelukt vanuit zowel Claude Code als Claude Desktop.
- [ ] `docs/ops/deployment.md` en `packages/mcp/README.md` bijgewerkt.
- [ ] `npm run check:queries`, `npm run lint`, `npm run type-check`, `npm test` groen.
