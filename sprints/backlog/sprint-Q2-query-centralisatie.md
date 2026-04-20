# Sprint Q2 — Query & Mutation Centralisatie

**Area:** `apps/cockpit/src/actions/`, `apps/devhub/src/actions/`, `packages/database/src/`
**Priority:** Hoog — zonder dit is "single source of truth" een leugen
**Aanleiding:** Conventie-drift onderzoek (2026-04-20): 13 directe `.from()` Supabase-calls in action-files die volgens CLAUDE.md in `packages/database/mutations/` of `/queries/` horen. Duplicate queries ontstaan onzichtbaar, wijzigingen in schema raken niet alle callers.

## Doel

Alle database-access gaat via `packages/database/`. Actions orkestreren (valideren, muteren via helpers, revalideren). Geen directe Supabase client calls meer in `apps/*/actions/` of `apps/*/components/`.

## Context

**Concrete overtredingen (pad:regel):**

- `apps/cockpit/src/actions/meeting-pipeline.ts:44,48,83,84,128,139,144` — 6× `.from("meetings")` + 1× `.from("meeting_project_summaries")`
- `apps/cockpit/src/actions/meetings.ts` — `.from("meeting_projects")` calls
- `apps/cockpit/src/actions/email-filter.ts:45` — `.from("emails")`
- `apps/devhub/src/actions/classify.ts:77` — `.from("projects")`
- `apps/devhub/src/actions/issues.ts` — `.from("projects")`
- `apps/devhub/src/actions/slack-settings.ts:39,56` — `.from("project_slack_config")` upsert + delete

## Taken

### Q2-1: Inventariseer en categoriseer

**Bestand:** `docs/q2-inventory.md` (tijdelijk werkdocument)

- [ ] Grep alle `.from(` in `apps/*/src/actions/` en `apps/*/src/components/` — lijst volledig
- [ ] Categoriseer per doel-tabel (meetings, projects, emails, issues, ...)
- [ ] Per call: is dit een read of write? Past het bij bestaande query/mutation-module of is nieuwe module nodig?

### Q2-2: Meeting-pipeline extractie

`meeting-pipeline.ts` is het grootste overtreder-bestand (438 regels, 7 directe calls).

- [ ] Nieuwe functies in `packages/database/mutations/meetings.ts`:
  - `resetMeetingSummary(meetingId)`
  - `resetMeetingExtractions(meetingId)`
  - `resetMeetingEmbeddings(meetingId)`
  - `deleteMeetingProjectSummaries(meetingId)`
- [ ] Vervang directe calls in `meeting-pipeline.ts` door deze helpers
- [ ] Behoud dezelfde transacties/volgorde

### Q2-3: Email-filter extractie

- [ ] Voeg `listEmailsForFilter(params)` toe aan `packages/database/queries/emails.ts`
- [ ] Exporteer `parseDirection()`, `parseFilterStatus()` helpers (nu in `apps/cockpit/src/app/(dashboard)/emails/page.tsx:21-27`) naar dezelfde query-module
- [ ] Vervang direct call in `email-filter.ts`

### Q2-4: DevHub classify / issues / slack-settings

- [ ] `classify.ts`: `getProjectForClassification(projectId)` naar `packages/database/queries/projects.ts`
- [ ] `issues.ts`: hergebruik bestaande `getProjectById()` in plaats van nieuwe `.from()`
- [ ] `slack-settings.ts`: voeg `upsertSlackConfig()` en `deleteSlackConfig()` toe aan nieuwe `packages/database/mutations/slack-config.ts`

### Q2-5: Lint-regel tegen regressies

**Bestand:** `.eslintrc` of custom eslint-plugin

- [ ] Voeg custom rule toe die `from("...")` calls in `apps/*/src/actions/` en `apps/*/src/components/` afkeurt
- [ ] Alternatief: grep-check in CI (`scripts/check-no-direct-supabase.sh`) als lint-rule te complex is
- [ ] Documenteer uitzonderingen expliciet als die er zijn

### Q2-6: Documentatie bijwerken

- [ ] `packages/database/README.md` (nieuw) — beschrijf welke query/mutation bij welk domein hoort
- [ ] `CLAUDE.md` regel-sectie: verwijs naar de lint-check uit Q2-5

## Afronding

- [ ] Alle 13 directe `.from()` calls uit de onderzoek-lijst zijn vervangen
- [ ] `apps/cockpit/src/actions/` en `apps/devhub/src/actions/` bevatten geen directe Supabase client meer (alleen `getServerClient()` voor auth is toegestaan)
- [ ] `npm run lint` groen met de nieuwe rule
- [ ] Tests in `apps/cockpit/__tests__/actions/` en `apps/devhub/__tests__/actions/` groen
- [ ] `docs/dependency-graph.md` geregenereerd
