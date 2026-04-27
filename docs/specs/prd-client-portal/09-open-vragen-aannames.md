# 9. Open Vragen & Aannames

## Open vragen

- [ ] **Subdomein**: `portal.jouwaipartner.nl`, `klant.jouwaipartner.nl`, of per-klant subdomein? (Stef beslist)
- [ ] **Productie-impact label**: bestaat het label `production` of `customer-impact` al in DevHub-issues? Wie zet het, wanneer? Handmatig of vanuit Sentry/error-monitoring (Sentry zelf is v2)?
- [ ] **Eerste invulling `client_visible`**: bij rollout, wordt CAI's bestaande backlog (~150 items?) eerst handmatig gefilterd, of starten alle bestaande issues op `false` en kiest het team welke zichtbaar worden?
- [ ] **Sessie-duur**: Supabase JWT-expiry op default ~1 jaar. PRD eist 30 dagen. Wijzigen via Supabase config of accepteren we default?
- [ ] **Autentieke deelnemers**: wie van CAI krijgen toegang in week 1? Alleen Stefan, of ook Joep + Chloë?

## Aannames (na codebase-review bevestigd of weerlegd)

- **Aanname 1 — bevestigd**: `organizations`-tabel bestaat, `profiles.organization_id` bestaat (`20260417100000_portal_client_role.sql`). Geen extra multi-tenancy-werk nodig.
- **Aanname 2 — herzien**: ~~De Cockpit-app heeft een UI voor issue-beheer~~. **Werkelijkheid:** Issues wonen in DevHub (`apps/devhub/src/features/issues/`); de toggle wordt daar toegevoegd, niet in Cockpit. Werkimpact: +0.5 dag (bestaande editor uitbreiden), niet +2-3 dagen.
- **Aanname 3 — bevestigd**: Status-enum is exact `triage|backlog|todo|in_progress|done|cancelled` (`packages/database/src/constants/issues.ts`). Bucket-mapping is leidend vanuit `PORTAL_STATUS_GROUPS` — geen aanpassing nodig.
- **Aanname 4**: Stefan accepteert in week 1 een puur read-only ervaring zonder comments/voting. Risico als dit niet zo is: vroeg moeten upgraden naar v2-features.
- **Aanname 5 — bevestigd**: Email-OTP via Supabase default mailer is voldoende qua deliverability voor 5-15 users. Risico bij problemen: Resend-integratie nodig (+0.5 dag).
- **Aanname 6 (nieuw)**: Bestaande RLS-policy op `issues` (`20260418110000_issues_rls_client_hardening.sql`) wordt vervangen door uitgebreide variant met `client_visible = true` filter. Geen breaking change voor admins/members; clients zien minder (correct).
