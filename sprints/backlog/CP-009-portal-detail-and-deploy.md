# Micro Sprint CP-009: Portal Issue-Detail + Productie-Deploy

## Doel

Laatste sprint van portal v1: issue-detailpagina uitbreiden met `client_title`/`client_description`-fallback en source-indicator, `apps/portal/vercel.json` toevoegen voor deploy-pariteit, en de portal live krijgen op `https://portal.jouw-ai-partner.nl/`. Eindigt met validatiesessie waarin Stefan Roevros (CAI) zelf het overzicht doorloopt — daarmee is de "Stefan First"-doelstelling afgerond.

## Requirements

| ID           | Beschrijving                                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| DEPLOY-V1-01 | Issue-detailpagina toont `client_title \|\| title` als heading en rendert `client_description \|\| description` als markdown |
| DEPLOY-V1-02 | Issue-detail toont source-indicator (icoon + tooltip) en bucket-label uit `PORTAL_STATUS_LABELS`                             |
| DEPLOY-V1-03 | Issue van een ander project geeft 404 (RLS + extra defensieve scope-check in `getPortalIssue`)                               |
| DEPLOY-V1-04 | `apps/portal/vercel.json` aanwezig met dezelfde structuur als `apps/cockpit/vercel.json` / `apps/devhub/vercel.json`         |
| DEPLOY-V1-05 | Vercel-project gekoppeld; productie-deploy succesvol op `https://portal.jouw-ai-partner.nl/` (let op hyphens)                |
| DEPLOY-V1-06 | RLS-bewijs: testaccount van een andere klant ziet geen CAI-data (handmatige test gedocumenteerd)                             |
| DEPLOY-V1-07 | Stefan Roevros (CAI) heeft een client-account met `portal_project_access` rij voor het CAI-project                           |
| DEPLOY-V1-08 | Validatiesessie met Stefan ingepland en uitgevoerd; lessons learned vastgelegd in `sprints/done/CP-009-...md`                |

## Afhankelijkheden

- **CP-006** (schema foundation) — kolommen + types
- **CP-007** (DevHub editor) — zonder ingevulde hertalingen test je de fallback eindstand niet realistisch
- **CP-008** (bucket dashboard) — klant landt eerst op overzicht, klikt door naar detail
- CP-002 (auth) — login-flow voor het Stefan-account

## Taken

### 1. Detail-pagina rendering

- `apps/portal/src/app/(app)/projects/[id]/issues/[issueId]/page.tsx`:
  - Heading wordt `issue.client_title ?? issue.title`
  - Body wordt `issue.client_description ?? issue.description` (gerenderd als markdown via bestaande renderer; check `apps/portal/src/components/issues/issue-detail.tsx`)
  - Source-indicator naast heading via `resolvePortalSourceGroup(issue.source)` — herbruik component uit CP-008
  - Status-badge gebruikt `PORTAL_STATUS_LABELS[INTERNAL_STATUS_TO_PORTAL_KEY[issue.status]]`
  - Type-badge en priority-badge zoals bestaand
  - `created_at` + `updated_at` relatief

### 2. Markdown rendering verifiëren

- Check of `apps/portal/src/components/issues/issue-detail.tsx` al een markdown-renderer gebruikt
- Zo nee: gebruik dezelfde renderer als DevHub (waarschijnlijk `react-markdown` of een variant) — geen nieuwe dependency als hij al bestaat in de monorepo
- Veiligheid: geen rauwe HTML toelaten

### 3. 404-gedrag

- `getPortalIssue` retourneert al `null` bij mismatch (`packages/database/src/queries/portal/core.ts:290-308`)
- `apps/portal/src/app/(app)/projects/[id]/issues/[issueId]/page.tsx`: bij `null` → `notFound()` aanroepen (Next 16)
- Verifieer dat `not-found.tsx` aanwezig is en gebruikersvriendelijk: "Issue niet gevonden of geen toegang" + terug-link

### 4. vercel.json toevoegen

- Kopieer `apps/cockpit/vercel.json` structuur naar `apps/portal/vercel.json` en pas paden/build-commands aan
- Verifieer dat `npm run build --workspace=@repo/portal` lokaal werkt voordat je pusht
- Voeg eventuele middleware/rewrites toe die nodig zijn voor de portal-subdomein

### 5. Vercel deploy + DNS

- Maak Vercel-project (of update bestaand portal-project) gekoppeld aan deze repo
- Stel env-vars in: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_DEVHUB_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Custom domain `portal.jouw-ai-partner.nl` toevoegen + DNS bij domeinregistrar bijwerken
- Test productie-build via preview-URL voor je het hoofd-domein omschakelt

### 6. RLS-bewijs

- Maak een tweede testaccount aan in een andere `organization` met `portal_project_access` op een ander project
- Login als die testaccount → bevestig dat:
  - `/` toont alleen het andere project, geen CAI
  - Direct navigeren naar `/projects/<CAI-project-id>/issues` geeft een 404 of geen data (RLS blokt server-side)
  - Direct navigeren naar `/projects/<CAI-project-id>/issues/<CAI-issue-id>` geeft 404
- Documenteer test-resultaat in een korte notitie (kan in sprint-file zelf bij completion)

### 7. Stefan-account aanmaken

- Profile-rij voor Stefan Roevros met `role = 'client'` en `organization_id = <CAI org>`
- `portal_project_access` rij voor Stefan ↔ CAI-project
- Login-test: Stefan ontvangt OTP en kan inloggen

### 8. Validatiesessie

- Plan een 30-minuten sessie met Stefan
- Doel: hij doorloopt zelf het overzicht, geeft feedback op:
  - Begrijpt hij de 4 buckets?
  - Werkt de source-switch zoals verwacht?
  - Welke informatie mist hij?
- Notuleer in dezelfde sprint-file (na sluiting) als input voor v2 (voting/sign-off/comments)

### 9. Sprint afronden

- Verplaats sprint-file van `sprints/backlog/` naar `sprints/done/` met validatie-notities aangevuld
- Update `docs/specs/prd-client-portal/00-index.md` status van "Draft" naar "Released v1"

## Verificatie

- [ ] Detail-pagina rendert `client_title` als gevuld, anders `title`
- [ ] Detail-pagina rendert `client_description` als markdown (bold, lists, links werken)
- [ ] Issue van ander project geeft 404 zonder leak
- [ ] Terug-knop naar `/projects/[id]/issues` werkt
- [ ] `apps/portal/vercel.json` bestaat en build slaagt
- [ ] Productie-URL `https://portal.jouw-ai-partner.nl/` is bereikbaar over HTTPS
- [ ] RLS-bewijs gedocumenteerd: testaccount andere klant ziet geen CAI-data
- [ ] Stefan kan inloggen via OTP en ziet alleen CAI-issues
- [ ] Validatiesessie afgerond + lessons learned vastgelegd
- [ ] PRD-status bijgewerkt naar "Released v1"

## Bronverwijzingen

- PRD: `docs/specs/prd-client-portal/05-functionele-eisen.md` §5.3 (issue-detail)
- PRD: `docs/specs/prd-client-portal/07-technische-constraints.md` (deploy)
- PRD: `docs/specs/prd-client-portal/10-acceptatiecriteria.md` (volledig)
- PRD: `docs/specs/prd-client-portal/11-sprint-indicatie.md` week 3
- Bestaand: `apps/cockpit/vercel.json` als template
- RLS-bron: `supabase/migrations/20260418110000_issues_rls_client_hardening.sql`
