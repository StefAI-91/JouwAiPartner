# 9. Open Vragen & Aannames

## Open vragen

- [ ] **Subdomein**: `portal.jouwaipartner.nl`, `klant.jouwaipartner.nl`, of per-klant subdomein? (Stef beslist)
- [ ] **DevHub status enum**: zijn `triage`, `backlog`, `todo`, `in_progress`, `done`, `cancelled` de complete lijst, of zijn er afgeleide states die we missen?
- [ ] **Productie-impact label**: bestaat het label `production` al in DevHub? Zo nee, wie zet het en wanneer? Wordt dit handmatig of vanuit Sentry/error-monitoring?
- [ ] **Eerste invulling `client_visible`**: bij rollout, wordt CAI's bestaande backlog (~150 items?) eerst handmatig gefilterd, of worden alle bestaande issues default `false`?
- [ ] **Branding**: JAIP-huisstijl gedefinieerd? Zo nee, gebruikt portal Cockpit-stijl?
- [ ] **Autentieke deelnemers**: wie van CAI krijgen toegang in week 1? Alleen Stefan, of ook Joep + Chloë?

## Aannames

- **Aanname 1**: Het bestaande shared Supabase-schema heeft al een `organizations`-tabel en `users.organization_id`. Risico als dit niet klopt: extra werk om multi-tenancy op te zetten (+1-2 dagen).
- **Aanname 2**: De Cockpit-app heeft al een UI voor JAIP-admins om issues te beheren — we voegen alleen een toggle "Zichtbaar voor klant" toe. Risico als dit niet klopt: aparte admin-screens nodig (+2-3 dagen).
- **Aanname 3**: DevHub gebruikt de status-enum zoals beschreven in sectie 5.2. Risico als anders: bucket-mapping moet aangepast worden (+0.5 dag).
- **Aanname 4**: Stefan accepteert in week 1 een puur read-only ervaring zonder comments/voting. Risico als dit niet zo is: vroeg moeten upgraden naar v2-features.
- **Aanname 5**: Magic link via Supabase default mailer is voldoende qua deliverability voor 5-15 users. Risico bij problemen: Resend-integratie nodig (+0.5 dag).
