# 9. Open Vragen & Aannames

## Open vragen — beantwoord op 2026-04-27

- ✅ **Subdomein**: `https://portal.jouw-ai-partner.nl/` (let op: hyphens in domeinnaam)
- ✅ **Productie-impact label**: vervalt — er is geen automatisch visibility-mechanisme meer (zie §4 scope-wijziging)
- ✅ **Eerste invulling `client_visible`**: vervalt — alle issues van een project zijn zichtbaar voor de klant; transparantie via source-switch
- ✅ **Sessie-duur**: Supabase JWT-default (~1 jaar) wordt geaccepteerd in v1; geen aparte config nodig
- ✅ **Deelnemers week 1**: alleen Stefan Roevros (CAI). Joep + Chloë volgen later

## Open vragen — nog niet beantwoord

- [ ] **Source-indicator op cards**: subtiel icoon (mijn voorstel) of expliciet label naast titel? Design-keuze.

## Buiten scope van deze PRD — apart te specificeren

- **AI-hertaling van `client_title` / `client_description`**: een AI-pipeline wordt verantwoordelijk voor het automatisch genereren van klant-vriendelijke titels en beschrijvingen. Ontwerp (verification-gate, trigger-moment, model-keuze, prompts) volgt in een aparte spec. Voor v1 worden de velden handmatig ingevuld in de DevHub issue-editor.

## Aannames (na codebase-review bevestigd of weerlegd)

- **Aanname 1 — bevestigd**: `organizations`-tabel bestaat, `profiles.organization_id` bestaat (`20260417100000_portal_client_role.sql`).
- **Aanname 2 — herzien**: ~~Cockpit heeft een UI voor issue-beheer~~. Werkelijkheid: issues wonen in DevHub (`apps/devhub/src/features/issues/`); de twee tekstvelden voor `client_title`/`client_description` worden daar toegevoegd.
- **Aanname 3 — bevestigd**: Status-enum is exact `triage|backlog|todo|in_progress|done|cancelled` (`packages/database/src/constants/issues.ts`). Bucket-mapping is leidend vanuit `PORTAL_STATUS_GROUPS`.
- **Aanname 4 — bevestigd**: Stefan accepteert in v1 een ervaring zonder voting/sign-off/comments. Feedback-formulier zit wél in v1 (was al gebouwd in CP-005).
- **Aanname 5 — bevestigd**: Email-OTP via Supabase default mailer is voldoende qua deliverability voor 5-15 users.
- **Aanname 6 (nieuw, bevestigd)**: Bestaande RLS-policy op `issues` (`20260418110000_issues_rls_client_hardening.sql`) is sufficient — clients zien alle issues van projecten waar ze toegang toe hebben, schrijven mag alleen met `source='portal'` en status `triage`. Geen RLS-wijziging in deze sprint.
- **Aanname 7 (nieuw)**: Bekende `source`-waarden in productie zijn `manual`, `portal`, `userback`, `ai`. Onbekende waarden vallen default onder "JAIP-meldingen" in de switch. Risico bij nieuwe source: tweede categorie nodig — minimale UI-impact.
