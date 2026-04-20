# Sprint Q2b-A — Query Centralisatie: Team + Slack + Lint-tool

**Type:** Uitvoeringssprint — deel 1 van 3
**Blokkade:** Q2a afgerond (`docs/specs/query-inventory.md`)
**Area:** `apps/cockpit/src/actions/team.ts`, `apps/devhub/src/actions/slack-settings.ts`, `packages/database/`, `scripts/`, `.husky/`
**Priority:** Hoog
**Geschatte duur:** 1-2 uur
**Volgorde:** eerst Q2b-A, dan Q2b-B, dan Q2b-C

## Doel

- Migreer de 12 admin-mutation call-sites in `team.ts` + `slack-settings.ts` naar helpers.
- Zet de lint/check-tool live zodat regressies in de volgende sub-sprints automatisch geblokkeerd worden.
- Schrijf het client-scope beleid in `packages/database/README.md` zodat latere sub-sprints eenduidig zijn.

## Scope (telproces)

Exact 12 calls, bron: `docs/specs/query-inventory.md` sectie 1.1 (`team.ts` = 10) + sectie 1.3 (`slack-settings.ts` = 2).

Verificatie:

```bash
grep -n "\.from(\"" apps/cockpit/src/actions/team.ts apps/devhub/src/actions/slack-settings.ts | wc -l
```

moet exact **12** geven bij start van de sprint.

## Taken

### Q2b-A-1: Nieuwe helpers bouwen

- [ ] Nieuw bestand `packages/database/src/mutations/team.ts`:
  - [ ] `upsertProfile({ id, email, role }, client?)`
  - [ ] `updateProfileRole(userId, role, client?)`
  - [ ] `clearProjectAccess(userId, client?)`
  - [ ] `insertProjectAccess(rows, client?)` — accepteert `{ profile_id, project_id }[]`
- [ ] Uitbreiden `packages/database/src/queries/team.ts`:
  - [ ] `getProfileRole(userId, client?)` — returns `"admin" | "member" | "client" | null`
- [ ] Nieuw bestand `packages/database/src/mutations/slack-config.ts`:
  - [ ] `upsertSlackConfig({ projectId, webhookUrl, notifyEvents }, client?)`
  - [ ] `deleteSlackConfig(projectId, client?)`
- [ ] Alle helpers krijgen JSDoc met `@param client` en default-gedrag (admin fallback) conform Q2a sectie 4.2.

### Q2b-A-2: Call-sites migreren

- [ ] `apps/cockpit/src/actions/team.ts:87` — `profiles` upsert → `upsertProfile`
- [ ] `apps/cockpit/src/actions/team.ts:95, 107, 154, 156, 203` — `devhub_project_access` delete → `clearProjectAccess`
- [ ] `apps/cockpit/src/actions/team.ts:102, 159` — `devhub_project_access` insert → `insertProjectAccess`
- [ ] `apps/cockpit/src/actions/team.ts:142` — `profiles` update → `updateProfileRole`
- [ ] `apps/cockpit/src/actions/team.ts:150` — `profiles` select → `getProfileRole`
- [ ] `apps/devhub/src/actions/slack-settings.ts:39` — `project_slack_config` upsert → `upsertSlackConfig`
- [ ] `apps/devhub/src/actions/slack-settings.ts:56` — `project_slack_config` delete → `deleteSlackConfig`
- [ ] Behoud `{ success } | { error }` contract, Zod-validatie en `revalidatePath` calls.
- [ ] Verwijder ongebruikte `getAdminClient`-imports.

### Q2b-A-3: Lint/check-tool activeren

Per Q2a sectie 5.2/5.3:

- [ ] Schrijf `scripts/check-no-direct-supabase.sh` exact volgens het skeleton uit Q2a sectie 5.3.
- [ ] Maak script executable (`chmod +x`).
- [ ] Voeg `check:queries` script toe aan root `package.json`.
- [ ] Voeg hook-regel toe aan `.husky/pre-commit` die het script aanroept (na bestaande `npx lint-staged`).
- [ ] Test regressie: voeg tijdelijk `supabase.from("profiles")` toe aan een actions-bestand → commit wordt geblokkeerd.
- [ ] Documenteer in script-header: welke paden in scope zijn (Q2b = actions + API routes) en dat Q2c Server Components toevoegt.

### Q2b-A-4: Client-scope beleid in README

- [ ] Nieuw of bestaand `packages/database/README.md`: sectie "Client-scope" met de tekst uit Q2a sectie 4.2.
- [ ] Voeg signatuur-voorbeeld toe uit Q2a sectie 4.3.
- [ ] Link vanuit `CLAUDE.md` (Database & Queries-sectie) naar deze README.

### Q2b-A-5: Tests

- [ ] Draai `npm test` — alles groen. Bestaande mocks voor `team.ts` kunnen aangepast moeten worden (payload-capture op mutation-helpers i.p.v. op `.from()`).
- [ ] Als een test wordt aangepast: commit-message moet uitleggen welk gedrag bewust verdwenen is (CLAUDE.md regel).

## Afronding

- [ ] `grep -n "\.from(\"" apps/cockpit/src/actions/team.ts apps/devhub/src/actions/slack-settings.ts | wc -l` = **0**
- [ ] `npm run check:queries` geeft 0 hits voor deze 2 bestanden.
- [ ] `npm run lint` groen.
- [ ] `npm run type-check` groen.
- [ ] `npm test` groen (met eventuele test-aanpassingen gemotiveerd gecommit).
- [ ] Dep-graph geregenereerd (`npm run dep-graph`).
- [ ] Sprint verplaatst naar `sprints/done/`.
