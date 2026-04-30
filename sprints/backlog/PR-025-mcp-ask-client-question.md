# Micro Sprint PR-025: MCP-tool `ask_client_question`

## Doel

Claude Code én Claude Desktop in staat stellen om tijdens development een vraag rechtstreeks in de portal-inbox van een klantproject te plaatsen. Plumbing voor de inbox bestaat al (PR-022/PR-023): `client_questions`-tabel, `sendQuestion`-mutation en de portal-pagina die open vragen rendert. Wat ontbreekt is een **schrijf-ingang vanuit de MCP-server**, zodat een dev die tijdens een sprint tegen een productvraag aanloopt ("welke datum-format wil je in de export?") die direct bij de klant kan uitzetten zonder de UI te openen.

E-mail- of Slack-notificatie naar de klant valt **buiten scope** — dat parkeren we als follow-up sprint. Dit sprint maakt alleen het schrijfpad.

## Requirements

| ID         | Beschrijving                                                                                                                                                                                                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-MCP-080 | Nieuwe MCP-tool `ask_client_question` geregistreerd in `packages/mcp/src/server.ts` via een nieuwe `registerWriteClientQuestionTools` (analoog aan `registerWriteClientUpdateTools`).                                                                                                                                              |
| PR-MCP-081 | Tool-input: `project` (by `id` óf `organization_name + project_name`), `body` (string, min 10, max 2000 — matcht `sendQuestionSchema`), `asked_by_name` (verplicht), optioneel `due_date` (YYYY-MM-DD), optioneel `topic_id`, optioneel `issue_id`.                                                                                |
| PR-MCP-082 | Identity: `asked_by_name`-parameter (zelfde patroon als `create_task` met `created_by_name`). Tool resolved via `findProfileIdByName` en weigert profielen met client-rol als defense-in-depth boven RLS. **Niet via env-var** — de MCP-server is HTTP, één deploy = één env-vars-set, dus env-var-afzender breekt voor productie. |
| PR-MCP-083 | Project-resolutie volgt patroon uit `write-tasks.ts` / `write-client-updates.ts`: probeer eerst `id`, anders fuzzy-match via organization+project (utils).                                                                                                                                                                         |
| PR-MCP-084 | Tool roept `sendQuestion(input, senderProfileId, adminClient)` aan (bestaande mutation, niet aanpassen). Geen directe `.from()` in de tool.                                                                                                                                                                                        |
| PR-MCP-085 | Tool-output: `{ question_id, project_name, organization_name, portal_url }` waarbij `portal_url` linkt naar `/projects/<id>/inbox` op de portal-host (env `NEXT_PUBLIC_PORTAL_URL`).                                                                                                                                               |
| PR-MCP-086 | `trackMcpQuery` aangeroepen voor usage-tracking (zelfde patroon als andere write-tools).                                                                                                                                                                                                                                           |
| PR-MCP-087 | Tool-description noemt expliciet wanneer wél/niet gebruiken: "wel" = klant-blokkerende vraag tijdens dev; "niet" = interne afweging die het team zelf kan maken.                                                                                                                                                                   |
| PR-DOC-090 | `docs/ops/deployment.md` documenteert dat de MCP-server via cockpit's `/api/mcp`-route loopt en `ask_client_question` geen extra server-side env-var vereist (afzender komt uit de tool-call).                                                                                                                                     |
| PR-DOC-091 | `packages/mcp/README.md` documenteert dat de server HTTP/OAuth is (geen stdio) en hoe identity werkt voor `ask_client_question`.                                                                                                                                                                                                   |

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
  - Zod-schema voor input (project-discriminator + body + `asked_by_name` + optionele velden).
  - Resolve `asked_by_name` → profile_id via `findProfileIdByName`. Bij geen match → tool-error.
  - Defense-in-depth check: `getProfileRole(profile_id)` moet admin/member zijn (anders weigeren met leesbare melding voordat RLS klaagt).
  - Resolve project → projectId + organizationId (UUID-pad via `from('projects').eq().maybeSingle()`, naam-pad via `resolveOrganizationIds` + project-naam-filter binnen die orgs).
  - Roep `sendQuestion({ project_id, organization_id, body, due_date, topic_id, issue_id }, senderProfileId, getAdminClient())`.
  - Bij `MutationResult.error` → tool-error met de mutation-message.
  - Bij success → markdown-output met `question_id`, project, afzender, status, portal-deeplink.
  - `trackMcpQuery(supabase, "ask_client_question", body.slice(0, 80))`.

- `packages/mcp/src/server.ts`: import + register de nieuwe tool-set.

### 2. Tests

- `packages/mcp/__tests__/tools/write-client-questions.test.ts`:
  - Volgt het bestaande MCP write-tool-patroon (mock op `@repo/database/mutations/*` + `queries/*` + admin-client). Comment in test-file legt uit dat dit afwijkt van CLAUDE.md §Tests boundary-policy maar consistent is met `write-client-updates.test.ts` — een suite-brede refactor is een eigen sprint.
  - Cases:
    1. Happy path: project by id → `sendQuestion`-payload bevat juiste velden + `sender_profile_id` uit name-resolution.
    2. Project by `organization_name + project_name` → resolve werkt.
    3. Naam-pad faalt bij meerdere matches → leesbare melding.
    4. Onbekende `asked_by_name` → tool-error, geen sendQuestion.
    5. `asked_by_name` resolved naar client-rol → afgewezen.
    6. `due_date` YYYY-MM-DD → ISO datetime in payload.
    7. `NEXT_PUBLIC_PORTAL_URL` respecteerd in output.
    8. Onbekend project_id → tool-error.
    9. `sendQuestion` error → propageert naar tool-output.

### 3. Documentatie

- `docs/ops/deployment.md` — sectie "MCP server (`/api/mcp` op cockpit)" die uitlegt dat de server via cockpit's HTTP route geserveerd wordt (geen aparte deploy) en dat `ask_client_question` geen extra env-var vereist; afzender komt uit de tool-call.
- `packages/mcp/README.md` — sectie "MCP-config" die uitlegt dat de server geen stdio-process is, hoe identity werkt voor `ask_client_question` (tool-call parameter), en welke server-side env-vars de cockpit-deploy al heeft.

### 4. Manual verification

- Tool aanroepen via Claude Code in deze repo: `ask_client_question` met `project_id=<demo-uuid>`, `asked_by_name="Stef"`, `body="Welk datum-format wil je in de export?"`.
- Verifieer in Supabase: row in `client_questions` met juiste `sender_profile_id` (= jouw profiel-id), `project_id`, `organization_id`, `status='open'`.
- Open de portal-inbox-pagina van het Demo-project — vraag verschijnt bovenaan met "Stef" als afzender.
- Beantwoord via portal als test-klant — `status` flipt naar `responded` (bestaand gedrag uit PR-022).

## Out of scope

- E-mail-/Slack-notificatie aan de klant bij nieuwe vraag (volgende sprint).
- Reply-tool vanuit MCP.
- Rate-limiting / spam-guard.
- Auto-detectie van actief project op basis van werkmap/git-remote.
- UI-aanpassingen in portal of devhub.

## Definition of done

- [ ] Tool `ask_client_question` geregistreerd in `server.ts`, schema gevalideerd, tests groen.
- [ ] Identity via `asked_by_name` → `findProfileIdByName`; client-rol expliciet geweigerd.
- [ ] Manual verification gelukt vanuit zowel Claude Code als Claude Desktop.
- [ ] `docs/ops/deployment.md` en `packages/mcp/README.md` bijgewerkt — geen `MCP_SENDER_PROFILE_ID` meer (ontwerp-pivot tijdens implementatie, zie sectie "Identity" in `write-client-questions.ts`).
- [ ] `npm run check:queries`, `npm run type-check`, `npm test` groen.
