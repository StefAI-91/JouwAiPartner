# 4. Scope

## In scope (MVP — Stefan First)

- Magic link authenticatie via Supabase Auth
- Multi-tenant: klant ziet alleen issues van eigen organisatie (RLS via `organization_id`)
- Vier-bucket overzicht: `Opgelost` / `Komende week` / `Daarna` / `Backlog`
- Filtering tussen `Bugs` en `Features` binnen de buckets (toggle/tab)
- Issue detail-pagina met `client_title`, `client_description`, status, type, datum
- Automatische `client_visible`-regel voor productie-issues (label-based)
- Manuele override in Cockpit door JAIP-team
- Read-only mobiele weergave

## Expliciet buiten scope (v1)

- **Voting/prioritering door klant** — Reden: niet primair gevraagd door Stefan; eerste validatie is het versimpelde overzicht. v2.
- **Sign-off flow op deliverables** — Reden: niet ter sprake gekomen in CAI-meeting; toevoeging zonder validatie. v2.
- **Comments per issue** — Reden: vereist notificaties, threading, en moderatie — te complex voor 2-3 weken. v2.
- **Real-time sync naar DevHub** — Reden: data wordt al gedeeld via dezelfde Supabase database (monorepo), geen aparte sync nodig.
- **Klant-zelf-issues-aanmaken** — Reden: behoud van triage-controle aan JAIP-zijde. v2 of later.
- **SLA-overzicht en responstijden** — Reden: vraagt eerst SLA-definitie per klant. v2.
- **Meeting-samenvattingen via JAIP MCP** — Reden: aparte feature, niet primaire pijn. v2.
- **Sprint-roadmap-weergave** — Reden: bucket-weergave dekt al "wanneer komt het?". v2.
- **Document-delen (voorstellen, AV, oplevering)** — Reden: aparte content type. v2.

## Toekomstige uitbreidingen (v2+)

- **Voting** — Voorwaarde: v1 valideert dat klanten het overzicht waarderen, en er bestaat een feature-backlog die om input vraagt
- **Sign-off** — Voorwaarde: v1 toont dat klant de portal actief gebruikt; sign-off vereist dat klant ingelogd is
- **Comments** — Voorwaarde: v1 levert engagement; commentstroom vereist notificatie-infrastructuur
- **Productie-issues sectie** (eindgebruiker error logging zoals Sentry) — Voorwaarde: error logging-koppeling per klant project
- **Self-service issue aanmaken** — Voorwaarde: triage-workflow in Cockpit voor inkomende klant-issues
