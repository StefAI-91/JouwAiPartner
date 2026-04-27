# Sprint-indicatie (richtlijn, niet bindend)

> Auth, RLS, project-overzicht, issue-list/detail-basis en feedback-formulier zijn al opgeleverd in CP-001 t/m CP-005 (zie `docs/archive/portal-mvp.md` traceability matrix). Onderstaande sprints bouwen daarop voort. Scope is door de review op 2026-04-27 sterk verkleind: geen `client_visible`-laag, geen audit-log, geen Postgres-trigger.

## Week 1 — Schema + DevHub

- Migratie: 2 kolommen op `issues` (`client_title`, `client_description` — text, nullable)
- Constant `PORTAL_SOURCE_GROUPS` in `packages/database/src/constants/issues.ts`
- DevHub issue-editor uitbreiden met twee tekstvelden voor `client_title` en `client_description`
- Eerste invulling: het JAIP-team kiest op enkele bestaande CAI-issues hertalingen om mee te valideren

## Week 2 — Portal UI

- Vier-bucket dashboard-component (kolommen desktop / gestapeld mobiel) met telling per bucket
- Source-switch tabs (Alles / Onze meldingen / JAIP-meldingen)
- Type-filter tabs (Alles / Bugs / Features) — orthogonaal
- Source-indicator (icoon of subtiele badge) op issue-cards
- Issue detail-pagina uitbreiden: `client_title`/`client_description` fallback + source-indicator
- Portal-queries (`listPortalIssues`, `getPortalIssue`) aanvullen met `client_title`, `client_description`, `source`
- `apps/portal/vercel.json` toevoegen
- Mobiele styling controleren

## Week 3 — Validatie & oplevering

- Stefan-account aanmaken, productiedata laden
- End-to-end testen met testaccount andere klant (RLS-bewijs)
- Vercel-deploy + DNS naar `https://portal.jouw-ai-partner.nl/`
- Validatiesessie met Stefan inplannen
- Lessons learned documenteren als input voor v2 (voting/sign-off/comments)
