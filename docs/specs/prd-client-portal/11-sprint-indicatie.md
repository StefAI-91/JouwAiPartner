# Sprint-indicatie (richtlijn, niet bindend)

> Auth, RLS, project-overzicht, app-scaffolding zijn al opgeleverd in CP-001 t/m CP-003 (zie `docs/archive/portal-mvp.md` traceability matrix). Onderstaande sprints bouwen daarop voort.

## Week 1 — Database-laag

- Migratie: 5 kolommen op `issues` (`client_visible`, `client_visible_override`, `client_title`, `client_description`, `has_production_impact`)
- Migratie: `audit_log` tabel
- Postgres trigger voor auto-visibility + `has_production_impact`
- RLS-policy uitbreiden met `client_visible = true` filter
- DevHub issue-editor uitbreiden: drie toggle/text-velden + opslaan via bestaande mutation
- Eerste import: handmatig CAI-issues prepareren (welke `client_visible = true`)

## Week 2 — Portal UI

- Vier-bucket dashboard-component (kolommen desktop / gestapeld mobiel)
- Type-filter tabs (`Alles` / `Bugs` / `Features`) toevoegen aan bestaande issue-list
- Issue detail-pagina uitbreiden: `client_title`/`client_description` fallback + productie-impact-banner + 🔴 indicator op cards
- Portal-queries (`listPortalIssues`, `getPortalIssue`) aanvullen met nieuwe kolommen + `client_visible` filter
- `apps/portal/vercel.json` toevoegen
- Mobiele styling controleren

## Week 3 — Validatie & oplevering

- Stefan-account aanmaken, productiedata laden
- End-to-end testen met testaccount andere klant (RLS-bewijs)
- Vercel-deploy + subdomein
- Supabase config: sessie-duur naar 30 dagen
- Validatiesessie met Stefan inplannen
- Lessons learned documenteren als input voor v2 (voting/sign-off/comments/feedback-formulier)
