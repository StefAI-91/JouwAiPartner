# Sprint-indicatie (richtlijn, niet bindend)

> Auth, RLS, project-overzicht, issue-list/detail-basis en feedback-formulier zijn al opgeleverd in CP-001 t/m CP-005 (zie `docs/archive/portal-mvp.md` traceability matrix). Onderstaande sprints bouwen daarop voort. Scope is door de review op 2026-04-27 sterk verkleind: geen `client_visible`-laag, geen audit-log, geen Postgres-trigger.

## Week 1 — Schema + DevHub

- Migratie: 2 kolommen op `issues` (`client_title`, `client_description` — text, nullable)
- Constant `PORTAL_SOURCE_GROUPS` in `packages/database/src/constants/issues.ts`
- Helper `resolvePortalSourceGroup(source)` die onbekende `source`-waarden naar `'jaip'` mapt (zodat een nieuwe source-waarde niet stilletjes uit beide tabs verdwijnt)
- `InsertIssueData` én `UpdateIssueData` in `packages/database/src/mutations/issues/core.ts` uitbreiden met `client_title?: string | null` en `client_description?: string | null` (de interfaces zijn expliciet getypt; zonder uitbreiding rejecteert TypeScript de nieuwe velden in `updateIssue`)
- DevHub issue-editor uitbreiden met twee tekstvelden voor `client_title` en `client_description` (in `apps/devhub/src/features/issues/components/issue-form.tsx` of `sidebar-fields.tsx`)
- Cleanup §8 niet-functionele eisen: `audit_log` en visibility-changes-bullet zijn al verwijderd (deze PRD-revisie); zorg dat eventuele afgeleide docs niet meer naar de geschrapte tabel verwijzen
- Eerste invulling: het JAIP-team kiest op enkele bestaande CAI-issues hertalingen om mee te valideren

## Week 2 — Portal UI

- Vier-bucket dashboard-component (kolommen desktop / gestapeld mobiel) met telling per bucket op route `/projects/[id]/issues` (vervangt huidige `IssueStatusFilter`-view)
- Source-switch tabs (Alles / Onze meldingen / JAIP-meldingen)
- Type-filter tabs (Alles / Bugs / Features / Vragen) — orthogonaal aan source-switch, dekt volledig `ISSUE_TYPES`-enum
- Source-indicator (icoon of subtiele badge) op issue-cards, gebruikt `resolvePortalSourceGroup` voor de fallback
- Issue detail-pagina uitbreiden: `client_title`/`client_description` fallback + source-indicator
- Portal-queries uitbreiden:
  - `listPortalIssues` krijgt optionele filter-parameters `sourceGroup?: 'client' | 'jaip'` en `types?: IssueType[]` (filter op DB-niveau, geen JS-filtering); selectie aanvullen met `client_title`, `client_description`, `source`
  - `getPortalIssue` selectie aanvullen met `client_title`, `client_description`, `source`
- `apps/portal/vercel.json` toevoegen
- Mobiele styling controleren

## Week 3 — Validatie & oplevering

- Stefan-account aanmaken, productiedata laden
- End-to-end testen met testaccount andere klant (RLS-bewijs)
- Vercel-deploy + DNS naar `https://portal.jouw-ai-partner.nl/`
- Validatiesessie met Stefan inplannen
- Lessons learned documenteren als input voor v2 (voting/sign-off/comments)
