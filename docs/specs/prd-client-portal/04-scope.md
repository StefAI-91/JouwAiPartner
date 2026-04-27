# 4. Scope

## Reeds opgeleverd in eerdere sprints (zie `portal-mvp.md` archief)

- `apps/portal` Next.js 16 + Tailwind v4 scaffolding (CP-002)
- Email-OTP login + auth callback (CP-002)
- Client role op `profiles` + `portal_project_access` koppeltabel (CP-001)
- RLS-policies: clients zien alleen eigen org-projecten + verified content (CP-001)
- Middleware role-gating `["admin","client"]`, members → DevHub (CP-002)
- Basis issue-lijst en detail-pagina (`apps/portal/src/app/(app)/projects/[id]/issues/`)

## In scope (MVP — Stefan First)

- Vier-bucket overzicht: `Ontvangen` / `Ingepland` / `In behandeling` / `Afgerond` (mapping bestaat in `PORTAL_STATUS_GROUPS`)
- Type-filter tabs: `Alles` / `Bugs` / `Features` (nieuw — bestaande filter is alleen status)
- Issue detail-pagina met `client_title`/`client_description` fallback naar `title`/`description`
- Productie-impact 🔴 indicator + banner via `has_production_impact`
- Database-laag: `client_visible`, `client_visible_override`, `client_title`, `client_description`, `has_production_impact` op `issues`
- Postgres trigger voor automatische `client_visible`-regel (label-based + klant-bron)
- Manuele override via DevHub issue-editor
- `audit_log` tabel + trigger voor visibility-wijzigingen
- RLS-policy uitbreiden met `client_visible = true` filter
- Read-only mobiele weergave

## Expliciet buiten scope (v1)

- **Voting/prioritering door klant** — Reden: niet primair gevraagd door Stefan; eerste validatie is het versimpelde overzicht. v2.
- **Sign-off flow op deliverables** — Reden: niet ter sprake gekomen in CAI-meeting; toevoeging zonder validatie. v2.
- **Comments per issue** — Reden: vereist notificaties, threading, en moderatie — te complex voor 2-3 weken. v2.
- **Klant-zelf-issues-aanmaken (feedback-formulier)** — Reden: behoud van triage-controle aan JAIP-zijde. Was gepland in `portal-mvp.md` (FEED-P01..P05) maar wordt verschoven naar v2 om eerst het read-only overzicht te valideren met Stefan.
- **Real-time sync naar DevHub** — Reden: data wordt al gedeeld via dezelfde Supabase database (monorepo), geen aparte sync nodig.
- **SLA-overzicht en responstijden** — Reden: vraagt eerst SLA-definitie per klant. v2.
- **Meeting-samenvattingen via JAIP MCP** — Reden: aparte feature, niet primaire pijn. v2.
- **Sprint-roadmap-weergave** — Reden: bucket-weergave dekt al "wanneer komt het?". v2.
- **Document-delen (voorstellen, AV, oplevering)** — Reden: aparte content type. v2.
- **AI-powered Q&A (Communicator agent)** — Was uitgesteld in `portal-mvp.md`. Blijft uitgesteld.
- **Notificaties (email/push)** — Was uitgesteld in `portal-mvp.md`. Blijft uitgesteld.
- **Klant-specifieke branding/theming** — Was uitgesteld in `portal-mvp.md`. Blijft uitgesteld.

## Toekomstige uitbreidingen (v2+)

- **Voting** — Voorwaarde: v1 valideert dat klanten het overzicht waarderen, en er bestaat een feature-backlog die om input vraagt
- **Sign-off** — Voorwaarde: v1 toont dat klant de portal actief gebruikt; sign-off vereist dat klant ingelogd is
- **Comments** — Voorwaarde: v1 levert engagement; commentstroom vereist notificatie-infrastructuur
- **Feedback-formulier** (klant maakt issue aan met `source: 'portal'`) — Voorwaarde: triage-workflow in DevHub voor inkomende klant-issues
- **Productie-issues sectie** (eindgebruiker error logging zoals Sentry) — Voorwaarde: error logging-koppeling per klant project
- **Milestones / timeline** — Voorwaarde: datamodel voor projectfases
