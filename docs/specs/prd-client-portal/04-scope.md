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
